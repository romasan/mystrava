/**
 * YMaps
 */

const YReady = new Promise((resolve) => {
    ymaps.ready(resolve);
});

export const createLine = (conf = {}) => {

    const o = new ymaps.GeoObject({
        'geometry': {
            'type': "LineString",
            'coordinates': conf.coordinates
        },
        'properties': {
            'hintContent': conf.label,
        }   
    }, {
        'strokeColor': conf.color,
        'strokeWidth': 3,
        'strokeOpacity': 0.5
    });

    if (!conf.manual) {

        o.events.add("hover", e => {
            e.originalEvent.target.options.set({
                'strokeColor': '#0000ff',
                'strokeOpacity': 1,
                'zIndex': 999
            });
        });
    
        o.events.add("mouseleave", e => {
            e.originalEvent.target.options.set({
                'strokeColor': conf.color,
                'strokeOpacity': 0.5,
                'zIndex': 0
            });
        });
    }

    return o;
};

export let Ymap = null;
export let collection = null;

const init = () => {

    Ymap = new ymaps.Map('ymap', {
        'center': [0.0, 0.0],
        'zoom': 10,
        'controls': ['zoomControl', 'rulerControl', 'typeSelector']
    });

    ymaps.geolocation.get({
        provider: 'browser',
        mapStateAutoApply: true
    }).then(result => {
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        Ymap.geoObjects.add(result.geoObjects);
    });

    collection = new ymaps.GeoObjectCollection();
    Ymap.geoObjects.add(collection);
};

YReady.then(init);