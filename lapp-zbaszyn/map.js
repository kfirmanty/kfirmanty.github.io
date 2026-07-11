function initMapSystem() {
    const state = {
        players: {},
        map: L.map('map').setView([52.25, 15.921], 17)
    };

    const removePlayer = (playerId) => {
        console.log("Removing player", playerId);
        const playerCircle = state.players[playerId];
        delete state.players[playerId];
        if (playerCircle) {
            state.map.removeLayer(playerCircle);
        }
    }

    const updatePlayerPosition = (playerId, position) => {
        if (!state.players[playerId]) {
            const playerCircle = L.circle(position, {
                color: 'blue', fillColor: '#2a2', fillOpacity: 0.5, radius: 2
            }).addTo(state.map);
            state.players[playerId] = playerCircle;
        }
        const playerCircle = state.players[playerId];
        playerCircle.setLatLng(position);
    }

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 24,
        attribution: '&copy; OpenStreetMap'
    }).addTo(state.map);

    const addTarget = (target) => {
        L.marker([target.lat, target.lng])
            .addTo(state.map)
            .bindPopup(target.name)
            .bindTooltip(target.id, { permanent: true, direction: 'top' });
    }

    targets.filter(t => t.lat > 20).forEach(t => {
        addTarget(t);
    });

    L.polyline(route, { color: '#d33', weight: 4, opacity: 0.8 }).addTo(state.map);
    state.map.fitBounds(L.latLngBounds(route).pad(0.2));

    return {
        removePlayer,
        updatePlayerPosition,
        setView: (position) => {
            state.map.setView(position);
        }
    }
}
