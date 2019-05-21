
var friggConfig = {
    
    //"projectUrlPrefix": "http://frigg.local/api/project/",
    //"mediaFilePrefix": "http://frigg.local/storage/",

    /*
    //if you have Google Analytics you can listen for interresting events ...
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

        'content': function(element, sceneData, frigg){
            
            var d = new Diaporama(getDiaporamaOptions(element));
            makeDiaporamaNav(element, d);
        },

        'video': function(element, sceneData, frigg){
            var frame = element.querySelector('.videoFrame');
            var player = new Vimeo.Player(frame);

            frigg.pausableElements.push(player);
        },

        'text_input': function(element, sceneData, frigg) {
            var theForm = element.querySelector('.form');

            theForm.addEventListener("submit", function(event){
                event.preventDefault();

                var userInput = theForm.input.value.toLowerCase();

                for(var i in sceneData.pattern) {
                    var pattern = sceneData.pattern[i].content.toLowerCase();

                    if (pattern == userInput) {
                        element.classList.add("pattern_ok");
                        element.classList.remove("pattern_nok");

                        var targetIndex = Math.min(i, sceneData.success_link.length-1);
                        var targetScene = sceneData.success_link[targetIndex];

                        frigg.gotoScene(targetScene.destination_scene_id);
                        return
                    }
                }

                element.classList.add("pattern_nok");
                element.classList.remove("pattern_ok");
                theForm.input.value = "";

                if (sceneData.failure_link) {
                    var targetScene = sceneData.failure_link[0];
                    frigg.gotoScene(targetScene.destination_scene_id);
                }

            })

        },

        'qrcode': function(element, sceneData, frigg) {
            var theForm = element.querySelector('.form');

            var gotoFailure = function(){
                if (sceneData.failure_link) {
                    frigg.gotoScene(sceneData.failure_link[0].destination_scene_id);
                }
            }.bind(this);

            var gotoSuccess = function(sceneId){
                frigg.gotoScene(sceneId);
            }.bind(this);

            qrcode.callback = function(data) {
                try {
                    //expect : domain#project=XX&scene=YY
                    var projectIdPattern = /project=([0-9]+)/i;
                    var sceneIdPattern = /scene=([0-9]+)/i;

                    var projectId = data.match(projectIdPattern)[1];
                    var sceneId = data.match(sceneIdPattern)[1];

                    if (frigg.project.project_id != projectId) {
                        console.log("Qrcode : can't find project id");
                        element.classList.add("qrcode_error");
                        element.classList.remove("qrcode_processing");
                        return;
                    }

                    if (sceneData.authorized_link) {
                        for(var i in sceneData.authorized_link) {
                            var authorizedTargetId = sceneData.authorized_link[i].destination_scene_id;
                            if (authorizedTargetId == sceneId) {
                                console.log("Qrcode : found valid scene !");
                                element.classList.add("qrcode_success");
                                element.classList.remove("qrcode_processing");
                                return gotoSuccess(authorizedTargetId);
                            }
                        }

                        console.log("Qrcode : not a valid scene !");
                        element.classList.add("qrcode_failure");
                        element.classList.remove("qrcode_processing");
                        return gotoFailure();
                    }

                    element.classList.add("qrcode_failure");
                    element.classList.remove("qrcode_processing");

                } catch(e) {
                    console.log("Qrcode : error decoding code");
                    element.classList.add("qrcode_error");
                    element.classList.remove("qrcode_processing");
                }

            }

            theForm.addEventListener("input", function(event){
                element.classList.remove("qrcode_success");
                element.classList.remove("qrcode_failure");
                element.classList.remove("qrcode_error");
                element.classList.add("qrcode_processing");

                var file = theForm.input.files[0];

                if (file) {
                    var reader = new FileReader();
                    reader.readAsDataURL(file);

                    reader.onload = function (evt) {
                        qrcode.decode(evt.target.result);
                    }
                    reader.onerror = function (evt) {
                        element.classList.add("qrcode_error");
                        element.classList.remove("qrcode_processing");
                    }
                }
                
                
            });
        },

        'map': function (element, sceneData, frigg) {
            if (! sceneData.map_token[0].content) {
                console.error("You must set a map_token in your map template.")
            }

            var theMapId = "theMap";//"map" + Date.now();
            element.querySelector('.mapContainer').setAttribute('id', theMapId);

            mapboxgl.accessToken = sceneData.map_token[0].content;

            var mapOption = {
                container: theMapId
            }

            try {
                var position = '[' + sceneData.map_center[0].content + ']';
                mapOption.center = JSON.parse(position);
            } catch (e) {
                //default center
            }

            if (sceneData.map_zoom[0].content) {
                mapOption.zoom = sceneData.map_zoom[0].content;
            }


            if (sceneData.map_style[0]) {
                mapOption.style = sceneData.map_style[0].content;
            }

            var map = new mapboxgl.Map(mapOption);

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
                var level = destionationScene.geo_level;
                var levelName = getLevelName(destionationScene.geo_level);

                var label = destionationScene.label;

                //by level : 
                //https://www.mapbox.com/mapbox.js/api/v3.1.1/l-layergroup/
                //on https://www.mapbox.com/mapbox-gl-js/api/#map.event:zoomend 

                if (!latitude || !longitude) {
                    return;
                }

                var popupElt = document.createElement('div');
                popupElt.setAttribute("frigg-zoom-min", level);
                popupElt.className = toSceneTemplate + ' map-popup map-item map-level-'+level;
                popupElt.innerHTML = "<h3>" + label + '</h3>';

                var popupMarker = new mapboxgl.Marker({'element': popupElt, anchor: 'bottom'})
                  .setOffset([0, 0])
                  .setLngLat([longitude, latitude])
                  .addTo(map);

                var markerElt = document.createElement('div');
                markerElt.setAttribute("frigg-zoom-min", level);
                markerElt.className = toSceneTemplate + ' map-marker map-item map-level-'+ level;

                var marker = new mapboxgl.Marker(markerElt)
                  .setLngLat([longitude, latitude])
                  .addTo(map);

                var listener = function(){
                    frigg.gotoScene(destinationSceneId);
                }

                markerElt.addEventListener('click', listener);
                popupElt.addEventListener('click', listener);
            
            }

            var handleVisibility = function(map, frigg){
                var maxZoom = 25;
                var zoom = Math.round(map.getZoom());
                console.log("Map zoom : " + zoom);

                var selectorPattern = "div[frigg-zoom-min='%level%']";
                var selectorList = [];

                for (var i=zoom+1; i < maxZoom; i++) {
                    var selectorLine = selectorPattern.replace("%level%", i);
                    selectorList.push(selectorLine);
                }

                var selector = selectorList.join(',');

                var container = map.getContainer();
                frigg.applyClassBySelector(container, ".map-item", "hidden", "remove");
                frigg.applyClassBySelector(container, selector, "hidden", "add");
            }

            //poi & popup
            for(var connectionIndex in sceneData['poi_list']){
                var connection = sceneData['poi_list'][connectionIndex];
                createMarker(map, frigg, connection);
                
            }

            map.on("zoomend", function(data){
                handleVisibility(map, frigg);
            });

            map.resize();
            handleVisibility(map, frigg);
            
        }
    }
}