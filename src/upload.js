import { collection, createLine } from './ymaps.js';

const handleFileSelect = e => new Promise(resolve => {

    let file = e.target.files[0];

    const reader = new FileReader();

    reader.onload = e => {
        resolve(e.target.result);
    };

    if (file.name.includes('.gpx')) {
        reader.readAsText(file);
    }
});

const get = (e, p) => p.reduce((e, k) => e && e[k], e);

const calcDistance = ([lat1, lon1], [lat2, lon2]) => {
    const {sin, cos, acos, PI} = Math;
	const radlat1 = PI * lat1 / 180;
	const radlat2 = PI * lat2 / 180;
	const theta = lon1 - lon2;
    const radtheta = PI * theta / 180;
	let dist = sin(radlat1) * sin(radlat2) + cos(radlat1) * cos(radlat2) * cos(radtheta);
    dist = dist > 1 ? 1 : dist;
	dist = acos(dist);
	dist = dist * 180 / PI;
    dist = dist * 60 * 1.1515;
    dist = dist * 1.60934;
	return dist;
};

const parseGPX = raw => {

    let el = document.createElement('div');
    el.innerHTML = raw;

    const title = (el.querySelector('gpx metadata name') || el.querySelector('gpx trk name') || {}).innerText;
    const date = (el.querySelector('gpx metadata time') || {}).innerText;
    const segments = [...((el.querySelector('gpx trk trkseg') || {}).children || [])];

    let coordinates = segments
        .map(item => ([
            parseFloat(item.attributes[0].value),
            parseFloat(item.attributes[1].value),
        ]));

    const distance = coordinates.reduce((res, item) => ({
        'sum': (res.prev
            ? res.sum + calcDistance(res.prev, item)
            : res.sum
        ),
        'prev': item
    }), {'sum': 0}).sum.toFixed(2);

    const label = `
        <div style="color: grey">
            ${title ? `<div>${title}</div>` : ''}
            ${date ? `<div>${date}</div>` : ''}
            <div>${distance} км.</div>
        </div>
    `;
    
    const duration = ((
        new Date(get(segments, [segments.length - 1, 'children', 1, 'innerText'])) -
        new Date(get(segments, [0, 'children', 1, 'innerText']))
    ) / 36e5).toFixed(2);

    return { coordinates, label, date, distance, duration };
};

const loaded = new Promise(resolve => {
    document.addEventListener("DOMContentLoaded", resolve);
});

loaded.then(() => {
    
    document.querySelector('.upload input').addEventListener('change', e => {
        handleFileSelect(e)
            .then(raw => {

                const line = createLine({
                    ...parseGPX(raw),
                    color: '#0000ff',
                    manual: true,
                });

                collection.add(line);
            })
    }, false);
});