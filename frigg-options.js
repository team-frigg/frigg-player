
var friggConfig = {
    
    /*
    //if you have Google Analytics...
    'onProjectLoaded' : function(project){
        console.log("project : " + project.label);
        ga('send', 'event', 'Project', 'load', project.label);
    },

    'onSceneLoaded' : function(scene, project){
        ga('set', 'page', window.location.hash);
        ga('send', 'pageview');
        ga('send', 'event', 'Scene', 'load', project.label + "/" + scene.label, scene.id);

    },

    'onMediaPlayed' : function(scene, project){
        ga('send', 'event', 'Scene', 'media_played', project.label + "/" + scene.label, scene.id);
    },

    'onVariableChanged' : function(project, scene, variableName, variableValue){
        ga('send', 'event', 'Scene', 'variable_changed', project.label + "/" + scene.label + "/" + variableName , scene.id);
    },*/


    "onTemplateLoaded" : {

        'livre': function(element, sceneData, frigg){
            var d = new Diaporama(getDiaporamaOptions(element));
            makeDiaporamaNav(element, d);
        },

        'chapitre': function(element, sceneData, frigg){
            var d = new Diaporama(getDiaporamaOptions(element));
            makeDiaporamaNav(element, d);
        },

        'page_medias': function(element, sceneData, frigg){
            var d = new Diaporama(getDiaporamaOptions(element));
            makeDiaporamaNav(element, d);
        },



        'page_video': function(element, sceneData, frigg){
            var frame = element.querySelector('.videoFrame');
            var player = new Vimeo.Player(frame);

            frigg.pausableElements.push(player);
        },

        'page_carte': function (element, sceneData, frigg) {
            console.log("page_carte");
            
            var theMapId = "theMap";//"map" + Date.now();
            element.querySelector('.mapContainer').setAttribute('id', theMapId);

            mapboxgl.accessToken = 'pk.eyJ1IjoidGFiYXNjb3ZpZGVvIiwiYSI6ImNqaHVqd283bTBuYWYzcXFpdmdya3Y3eXAifQ.wDWy30KVv4--PEV0icwAAg';

            var map = new mapboxgl.Map({
                container: theMapId,
                style: 'mapbox://styles/tabascovideo/cjikfqj3209iv2snz12qvnnx7',
            });

            var geoTracker = new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            })

            map.addControl(geoTracker);
            window.setTimeout(function(){
                if (! geoTracker._geolocateButton) return;
                geoTracker._geolocateButton.click();
            }, 2000);
            

            //var mapElements = [];
            var thresholdLevel = 16;
            function getLevelName(level){
                if (!level) {
                    return "primary";
                }

                if (level >= thresholdLevel) {
                    return "primary";
                }

                return "secondary";
            }

            
            var createMarker = function(map, frigg, connection){
                
                var destinationSceneId = connection.destination_scene_id;
                var destionationScene = frigg.project.scenes[destinationSceneId];

                //console.log(destionationScene.template_id);
                var toSceneTemplate = "to-" + frigg._cleanTemplateName(frigg.project.templates[destionationScene.template_id].label);


                var latitude = destionationScene.geo_latitude;
                var longitude = destionationScene.geo_longitude;
                var level = getLevelName(destionationScene.geo_level);

                var label = destionationScene.label;

                //by level : 
                //https://www.mapbox.com/mapbox.js/api/v3.1.1/l-layergroup/
                //on https://www.mapbox.com/mapbox-gl-js/api/#map.event:zoomend 

                if (!latitude || !longitude) {
                    return;
                }

                var popupElt = document.createElement('div');
                popupElt.className = toSceneTemplate + ' map-popup map-item map-level-'+ level;
                popupElt.innerHTML = "<h3>" + label + '</h3>';

                var popupMarker = new mapboxgl.Marker({'element': popupElt, anchor: 'bottom'})
                  .setOffset([0, -25])
                  .setLngLat([longitude, latitude])
                  .addTo(map);

                
                var markerElt = document.createElement('div');
                markerElt.className = toSceneTemplate + ' map-marker map-item map-level-'+ level;

                var marker = new mapboxgl.Marker(markerElt)
                  .setLngLat([longitude, latitude])
                  .addTo(map);

                var listener = function(){
                    //alert("To : " + destinationSceneId);
                    frigg.gotoScene(destinationSceneId);
                }

                markerElt.addEventListener('click', listener);
                popupElt.addEventListener('click', listener);
            
            }

            

            //poi & popup
            for(var connectionIndex in sceneData['_anonymous_connection']){
                var connection = sceneData['_anonymous_connection'][connectionIndex];
                createMarker(map, frigg, connection);
                
            }

            map.on("zoomend", function(data){
                var zoom = Math.round(this.getZoom());

                var toHide = null;
                if (zoom <= thresholdLevel) {
                    toHide = ".map-level-secondary";
                }

                console.log("Map zoom : " + zoom + " vs threshold : " + thresholdLevel);
                console.log(" items to hide : " + toHide);

                var container = this.getContainer();
                frigg.applyClassBySelector(container, ".map-item", "hidden", "remove");
                if (toHide) frigg.applyClassBySelector(container, toHide, "hidden", "add");

                console.log(data);
                console.log(this.getZoom());
            });

            map.resize();
            
        }
    }
}