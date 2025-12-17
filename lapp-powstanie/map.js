function initMapSystem({ playerStartPos, currentPlayerId }) {
    const state = {
        players: {},
        map: L.map('map').setView(playerStartPos, 19)
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

    updatePlayerPosition(currentPlayerId, playerStartPos);

    const addTarget = (target) => {
        L.marker([target.lat, target.lng]).addTo(state.map).bindPopup(target.name);

        // Add a circle around the marker to represent the minimum distance
        const radius = (target.minDistance || MIN_DISTANCE) * 111000; // Convert degrees to meters
        L.circle([target.lat, target.lng], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.2,
            radius: radius
        }).addTo(state.map);
    }

    targets.filter(t => t.lat > 20).forEach(t => {
        addTarget(t);
    });

    return {
        removePlayer,
        updatePlayerPosition,
        setView: (position) => {
            state.map.setView(position);
        }
    }
}