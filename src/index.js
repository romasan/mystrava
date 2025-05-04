import { client_id, client_secret } from './conf.json';
import polyline from './polyline.js';
import { Ymap, collection, createLine } from './ymaps.js';
import './upload.js';
import { getGradient } from './colors.js';
// import 'select-pure'; // https://www.webcomponents.org/element/select-pure

const en_ru = {
  'All': 'Все',
  'Ride': 'Велосипед',
  'Walk': 'Ходьба'
};

const i18n = (word) => en_ru[word] || word;

function Random(seed) {
  this._seed = seed % 2147483647;
  if (this._seed <= 0) this._seed += 2147483646;
}

Random.prototype.next = function () {
  return this._seed = this._seed * 16807 % 2147483647;
};

Random.prototype.nextFloat = function () {
  return (this.next() - 1) / 2147483646;
};

const randomColor = (seed = 1) => {
  const r = new Random(seed);
  return '#' + Math.floor(0x100000 + r.nextFloat() * 0xefffff).toString(16);
}

/**
 * Strava API
 */

const get = (url, token) => fetch(url, {
  method: 'GET',
  headers: new Headers({
    Authorization: 'Bearer ' + token
  })
});

const search = [...(new URL(location.href)).searchParams.entries()].reduce((l, [k, e]) => ({ ...l, [k]: e }), {});

const filterCollection = ({ collection, list, type, year, id }) => {

  collection.removeAll();

  list.forEach(e => {

    if (
      (type === 'All' || e.type === type) &&
      (year === 'Год' || e.year == year)
    ) {
      collection.add(e.line);
    }

    if (id && e.id === id) {
      collection.add(e.line);
    }
  })
}

if (search.code) {

  const main = async () => {

    /*
    curl -X POST https://www.strava.com/api/v3/oauth/token \
    -d client_id=ReplaceWithClientID \
    -d client_secret=ReplaceWithClientSecret \
    -d code=ReplaceWithCode \
    -d grant_type=authorization_code
    */

    const tokenResp = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
          client_id,
          client_secret,
          code: search.code,
          grant_type: 'authorization_code'
      })
    });

    // const tokenResp = await fetch(
    //   'https://www.strava.com/oauth/token?' + [{
    //     client_id,
    //     client_secret,
    //     code: search.code,
    //     grant_type: 'authorization_code'
    //   }]
    //     .reduce((x, o) => (Object.entries(o)), 0)
    //     .map(([k, e]) => k + '=' + e)
    //     .join('&'),
    //   {
    //     method: 'POST'
    //   }
    // )
    const tokenJSON = await tokenResp.json()
    const token = tokenJSON.access_token
    
    let resp = await get('https://www.strava.com/api/v3/athlete/activities?per_page=200', token)
    let json = await resp.json()
    let list = json
    let page = 1
    while (json.length >= 200) {
      page += 1
      resp = await get(`https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`, token)
      json = await resp.json()
      list = [...list, ...json]
    }

    // const _colors = [
    //   '#FF0000',
    //   // '#FF7F00',
    //   // '#FFFF00',
    //   '#00FF00',
    //   '#0000FF',
    //   // '#2E2B5F',
    //   '#8B00FF',
    // ];
    let years = list
      .map(({ start_date }) => new Date(start_date).toString().split(' ')[3])
      .reduce((l, e) => l.includes(e) ? l : l.concat([e]), []);
    // const colors = years.reduce((l, e) => ({ ...l, [e]: randomColor(Number(e)) }), {});
    const _colors = getGradient(years.length);
    const colors = years.reduce((l, e) => ({ ...l, [e]: _colors.shift() }), {});

    list = list.map(({ id, name, type, start_date, distance, elapsed_time, map }, i) => {

      const coordinates = polyline.decode(map.summary_polyline);

      const date = new Date(start_date).toString().split('GMT')[0];
      const dist = parseFloat((distance / 1e3).toFixed(3));
      const time = parseFloat((elapsed_time / 36e2).toFixed(3));

      const year = Number(date.split(' ')[3]);
      const color = colors[year];

      const line = createLine({
        coordinates,
        'label': `
          <a href="https://www.strava.com/activities/${id}" target="_blank">${name}</a>&nbsp;
          <a href="#${id}" class="only_me">#</a>
          <div style="color: grey">
            <div>${date}</div>
            <div>${dist} км. ${time} ч.</div>
            <div>Тип: ${i18n(type)}</div>
          </div>
        `,
        'color': color,
      });

      return { id, type, line, year, dist };
    })

    let type = 'Ride';
    let year = 'Год';

    // ---

    let types = list.reduce((l, e) => l.includes(e.type) ? l : [...l, e.type], []);
    types.unshift('All');
    type = types.includes('Ride') ? 'Ride' : types[0];

    filterCollection({ collection, list, type, year });
    Ymap.setBounds(collection.getBounds());

    const typesList = document.querySelector('#types');
    typesList.children[0].remove();

    types.forEach(e => {
      const option = document.createElement('option');
      option.value = e;
      option.innerText = i18n(e) + ' (' + list.reduce((c, x) => c + ~~(e === 'All' || x.type === e), 0) + ')';
      if (e === type) { option.selected = true; }
      typesList.appendChild(option);
    });

    typesList.addEventListener('change', e => {
      type = e.target.value;
      filterCollection({ collection, list, type, year });
      Ymap.setBounds(collection.getBounds());
    });

    // ---

    years = list.reduce((l, e) => l.includes(e.year) ? l : [...l, e.year], []);

    const yearsList = document.querySelector('#years');

    const updateYearsList = () => {

      years.forEach(e => {
        const option = document.createElement('option');
        // const option = document.createElement('option-pure');
        option.value = e;
        const countOnYear = ~~list.reduce((c, x) => c + (x.year == e ? x.dist : 0), 0);
        const countOfYear = ~~list.reduce((c, x) => c + (x.year == e ? 1 : 0), 0);
        option.innerText = e + (e !== 'Год' ? ` (${countOnYear} km / ${countOfYear})` : '');
        yearsList.appendChild(option);
      });
    }
    updateYearsList();

    try {
      yearsList.addEventListener('change', e => {
        year = e.target.value;
        filterCollection({ collection, list, type, year });
        Ymap.setBounds(collection.getBounds());
      });
    } catch (error) {
      console.log('==== Error', error);
    }

    console.log('====', yearsList);

    // ---

    const labels = document.querySelector('#showLabels');

    labels.addEventListener('change', e => {
      list.forEach(({ line }) => {
        if (!e.target.checked) {
          line.properties.setAll({
            _hintContent: line.properties.getAll().hintContent,
            hintContent: ''
          });
        } else {
          line.properties.setAll({
            hintContent: line.properties.getAll()._hintContent,
          });
        }
      });
    });

    document.body.addEventListener('click', e => {
      if (e.target.classList.contains('only_me')) {
        const id = Number(e.target.href.split('#').pop());
        filterCollection({ collection, list, id });
        e.preventDefault();
      }
    });
  }

  main()
} else {
  const link = 'https://www.strava.com/oauth/authorize?' + [{
    client_id,
    redirect_uri: location.href.split('?')[0],
    response_type: 'code',
    scope: 'read,activity:read_all,profile:read_all,read_all'
  }]
    .reduce((x, o) => (Object.entries(o)), 0)
    .map(([k, e]) => k + '=' + e)
    .join('&');
  alert(link);
  location.href = link;
}