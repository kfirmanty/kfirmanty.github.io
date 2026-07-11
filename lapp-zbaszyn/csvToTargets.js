var fs = require('fs');

var csv = fs.readFileSync('targets.csv', 'utf8');

var lines = csv.split('\n');

const targets = lines.map(targetLine => {
    const [name, place, latlng, minDistance] = targetLine.split(/,(?!\s)/g);
    const [lat, lng] = latlng.replace(/"|\s+/g, '').split(',').map(Number);
    const id = name;
    return {
        name: place,
        lat: lat,
        lng: lng,
        id: id,
        minDistance: Number(minDistance) * 0.00001,
    };
})

fs.writeFileSync('targets.json', JSON.stringify(targets, null, 2));