import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, Linking, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const MapComponent = ({ address1, address2, coord1, coord2 }) => {
    const [loading, setLoading] = useState(true);
    const [coords, setCoords] = useState([]);

    useEffect(() => {
        if (address1 || address2 || coord1 || coord2) {
            geocodeAll();
        }
    }, [address1, address2, coord1, coord2]);

    const geocodeAll = async () => {
        setLoading(true);
        try {
            const newCoords = [];
            
            // Handle first location
            if (coord1 && coord1.lat && coord1.lon) {
                newCoords.push({ ...coord1, title: 'Seller Location', color: 'red' });
            } else if (address1) {
                const pos = await getCoords(address1);
                if (pos) newCoords.push({ ...pos, title: 'Location 1', color: 'red' });
            }

            // Handle second location
            if (coord2 && coord2.lat && coord2.lon) {
                newCoords.push({ ...coord2, title: 'Delivery Location', color: 'blue' });
            } else if (address2) {
                const pos = await getCoords(address2);
                if (pos) newCoords.push({ ...pos, title: 'Location 2', color: 'blue' });
            }
            
            setCoords(newCoords);
        } catch (error) {
            console.error("Geocoding error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getCoords = async (address) => {
        try {
            const parts = address.split(',').map(p => p.trim());

            // Try different combinations of the address for better accuracy
            const queries = [
                address, // Full address
                parts.slice(1).join(', '), // Skip house number
                parts.slice(-2).join(', '), // Just village and town
                parts.slice(-1).join(', ')  // Just town
            ];

            for (let query of queries) {
                if (!query) continue;
                const searchQuery = `${query}, Sri Lanka`;
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'SmartMarineApp/1.0' }
                });
                const data = await response.json();

                if (data && data.length > 0) {
                    return {
                        lat: parseFloat(data[0].lat),
                        lon: parseFloat(data[0].lon),
                    };
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    };


    const mapHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { height: 100vh; width: 100vw; }
                .leaflet-control-attribution { display: none; }
                .custom-div-icon {
                    background: none;
                    border: none;
                }
            </style>

        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map', { 
                    zoomControl: true,
                    touchZoom: true,
                    doubleClickZoom: true,
                    scrollWheelZoom: true,
                    dragging: true,
                    boxZoom: true
                }).setView([7.8731, 80.7718], 7);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                
                var coords = ${JSON.stringify(coords)};
                if (coords.length > 0) {
                    var markers = [];
                    
                    // Icons
                    var redIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ff0000" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="9" r="3" fill="#ffffff"/></svg>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                        popupAnchor: [0, -40]
                    });

                    var blueIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="9" r="3" fill="#ffffff"/></svg>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                        popupAnchor: [0, -40]
                    });

                    coords.forEach(function(c, index) {
                        var icon = index === 0 ? redIcon : blueIcon;
                        var marker = L.marker([c.lat, c.lon], { icon: icon }).addTo(map);
                        marker.bindPopup("<b>" + c.title + "</b>").openPopup();
                        
                        // Add highlight circle for primary location
                        if (index === 0) {
                            L.circle([c.lat, c.lon], {
                                color: '#ff0000',
                                fillColor: '#ff0000',
                                fillOpacity: 0.15,
                                radius: 300
                            }).addTo(map);
                        }

                        markers.push([c.lat, c.lon]);
                    });

                    // ── Actual Road Routing (OSRM) ──
                    if (markers.length > 1) {
                        var start = markers[0];
                        var end = markers[1];
                        var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + 
                                      start[1] + ',' + start[0] + ';' + end[1] + ',' + end[0] + 
                                      '?overview=full&geometries=geojson';

                        fetch(osrmUrl)
                            .then(response => response.json())
                            .then(data => {
                                if (data.routes && data.routes.length > 0) {
                                    var route = data.routes[0].geometry;
                                    var polyline = L.geoJSON(route, {
                                        style: {
                                            color: '#ff0000', // Red route line
                                            weight: 7,
                                            opacity: 0.8,
                                            lineJoin: 'round'
                                        }
                                    }).addTo(map);
                                    
                                    // Adjust bounds to fit the actual route
                                    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
                                } else {
                                    // Fallback to straight line if OSRM fails
                                    L.polyline(markers, { color: '#ff0000', weight: 5, dashArray: '10, 10' }).addTo(map);
                                }
                            })
                            .catch(err => {
                                L.polyline(markers, { color: '#ff0000', weight: 5, dashArray: '10, 10' }).addTo(map);
                            });
                    }
                    
                    if (coords.length === 1) {
                        map.setView([coords[0].lat, coords[0].lon], 15);
                    }
                }

            </script>
        </body>
        </html>
    `;

    const handleOpenExternalMaps = () => {
        if (coords.length > 0) {
            const { lat, lon } = coords[0];
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            Linking.openURL(url);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.map}
                scrollEnabled={true}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                scalesPageToFit={true}
                onLoadEnd={() => setLoading(false)}
            />



            {coords.length > 0 && !loading && (
                <TouchableOpacity style={styles.openMapsBtn} onPress={handleOpenExternalMaps}>
                    <Ionicons name="location-sharp" size={18} color="#fff" />
                    <Text style={styles.openMapsText}>Open in Google Maps</Text>
                </TouchableOpacity>
            )}

            {loading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 300,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    map: {
        flex: 1,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    openMapsBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        left: 12,
        backgroundColor: '#1e3a8a',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        elevation: 5,
    },
    openMapsText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    }
});

export default MapComponent;
