
var friggConfig = {
    
    //"projectUrlPrefix": "http://frigg.local/api/project/",
    //"mediaFilePrefix": "http://frigg.local/storage/",

    
    //if you have Google Analytics you can listen for interresting events ...
    'onProjectLoaded' : function(project) {

        var node = document.querySelector("meta[property='frigg:google_analytics_account']");
        var account = node ? node.getAttribute("content") : null;
        
        if (! account) {
            return
        }

        ga('create', account, 'auto');
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
    },

    'onMediaPlayedUpdate' : function(scene, project, updateData, element) {
        var cursorWidth = element.querySelector('.audioCursor.width');
        var cursorLeft = element.querySelector('.audioCursor.left');
        var cursorStable = element.querySelector('.audioCursor.stable');

        var content = "<span class='time elapsed'>"+updateData.elapsedSeconds+"s</span> <span class='time total'>"+updateData.durationSeconds+"s</span>";

        if (cursorWidth) {
            cursorWidth.style.width = updateData.elapsedPercent + '%';
            cursorWidth.innerHTML = content;
        }
        
        if (cursorLeft) {
            cursorLeft.style.left = updateData.elapsedPercent + '%';
            cursorLeft.innerHTML = content;
        }

        if (cursorStable) {
            cursorStable.innerHTML = content;
        }

    },


    "onTemplateLoaded" : {

        'content': function(element, sceneData, frigg){
            
            var d = new Diaporama(getDiaporamaOptions(element));
            makeDiaporamaNav(element, d);
        },

        'video': function(element, sceneData, frigg){
            var frame = element.querySelector('.videoFrame');
            var player = new Vimeo.Player(frame);

            player.on('play', function() {
                element.classList.add('media_playing');
                element.classList.remove('media_finished');
                element.classList.remove('media_paused');
            });

            player.on('pause', function() {
                element.classList.add('media_paused');
                element.classList.remove('media_playing');
                element.classList.remove('media_finished');
            });

            player.on('ended', function() {
                element.classList.add('media_finished');
                element.classList.remove('media_playing');
                element.classList.remove('media_finishing');
                element.classList.remove('media_paused');
            });

            player.on('timeupdate', function(e) {
                var p = e.percent * 100;

                if (p > 90 || e.duration - e.seconds < 5) {
                    element.classList.add('media_finishing');
                }
            });


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

            var theMapId = "map_" + frigg.currentSceneId;
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

            var trackUserIfNeeded = function(map, frigg){
                var trackUserLocation = frigg.hasCustomData('trackUserLocation');
                var autoTrackUserLocation = frigg.hasCustomData('autoTrackUserLocation');

                if (! trackUserLocation && ! autoTrackUserLocation){
                    return
                }

                var geoTracker = new mapboxgl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true
                    },
                    trackUserLocation: autoTrackUserLocation
                })

                map.addControl(geoTracker);

                window.setTimeout(function(){
                    if (! geoTracker._geolocateButton || ! autoTrackUserLocation) return;
                    geoTracker._geolocateButton.click();
                }, 2000);
            
            }

            var createTrace = function(identifier, data, style, map, frigg) {

                if (! data) {
                    return;
                }

                try{
                    var geojson = JSON.parse(data.content);
                    var traceStyle = style ? JSON.parse(style.content) : null;
                } catch (e) {
                    console.log("Error while decoding JSON trace or style. Ignoring trace.");
                    return;
                }

                map.addSource(identifier, { type: 'geojson', data: geojson });

                var layer = {
                    "id": "trace_" + identifier,
                    "type": "line",
                    "source": identifier,
                    /*"layout": {
                        "line-join": "round",
                        "line-cap": "round"
                        },*/
                    "paint": {
                        "line-color": "#000",
                        "line-width": 3
                    }
                };

                if (traceStyle) {
                    Object.assign(layer, traceStyle);
                }

                console.log("TRACE ", identifier);
                map.addLayer(layer);


            }

            var createMarker = function(map, frigg, connection, media, label){
                
                var destinationSceneId = connection.destination_scene_id;
                var destinationScene = frigg.project.scenes[destinationSceneId];

                //console.log(destinationScene.template_id);
                var toSceneTemplate = "to-" + frigg._cleanTemplateName(frigg.project.templates[destinationScene.template_id].label);

                var latitude = destinationScene.geo_latitude;
                var longitude = destinationScene.geo_longitude;
                var level = destinationScene.geo_level;

                //by level : 
                //https://www.mapbox.com/mapbox.js/api/v3.1.1/l-layergroup/
                //on https://www.mapbox.com/mapbox-gl-js/api/#map.event:zoomend 

                if (!latitude || !longitude) {
                    return;
                }

                var listener = function(){
                    frigg.gotoScene(destinationSceneId);
                }


                var className = frigg.getClassForLinkSlot(connection);
                if (className != 'link') {
                    className = "link " + className;
                }

                if (label && label.content && label.content != "-"){
                    var popupElt = document.createElement('div');
                    popupElt.setAttribute("frigg-zoom-min", level);
                    popupElt.className = toSceneTemplate + ' ' + className + ' map-popup map-item map-level-'+level;
                    popupElt.innerHTML = "<h3>" + label.content + '</h3>';

                    var popupMarker = new mapboxgl.Marker({'element': popupElt, anchor: 'bottom'})
                    .setOffset([0, 0])
                    .setLngLat([longitude, latitude])
                    .addTo(map);

                    popupElt.addEventListener('click', listener);
                }

                

                var markerElt = document.createElement('div');
                markerElt.setAttribute("frigg-zoom-min", level);
                markerElt.className = toSceneTemplate + ' ' + className + ' map-marker map-item map-level-'+ level;
                
                if (media) {
                    markerElt.style.backgroundImage = 'url(' + frigg.params.mediaFilePrefix + media.content + ')';
                    markerElt.classList.add('withImage');
                } else {
                    markerElt.classList.add('withoutImage');
                }
                

                var marker = new mapboxgl.Marker(markerElt)
                  .setLngLat([longitude, latitude])
                  .addTo(map);

                markerElt.addEventListener('click', listener);

            }

            var handleVisibility = function(map, frigg){
                var maxZoom = 25;
                var zoom = Math.round(map.getZoom());
                //console.log("Map zoom !!: " + zoom);

                var selectorPattern = "div[frigg-zoom-min='%level%']";
                var selectorList = [];

                for (var i=zoom+1; i < maxZoom; i++) {
                    var selectorLine = selectorPattern.replace("%level%", i);
                    selectorList.push(selectorLine);
                }

                var selector = selectorList.join(',');
                //console.log(selector);
                var container = map.getContainer();
                frigg.applyClassBySelector(container, ".map-item", "hidden", "remove");
                frigg.applyClassBySelector(container, selector, "hidden", "add");
            }


            map.on('load', function () {

                trackUserIfNeeded(map, frigg);
                createTrace("main_trace", sceneData.trace_geojson ? sceneData.trace_geojson[0]: null, sceneData.trace_style ? sceneData.trace_style[0] : null, map, frigg);

                //poi & popup
                for(var connectionIndex in sceneData['poi_list']){
                    var connection = sceneData['poi_list'][connectionIndex];
                    var media = null;
                    var label = null;

                    if (sceneData['poi_icon'] ){
                        var match = sceneData['poi_icon'][connectionIndex];
                        var last = sceneData['poi_icon'][sceneData['poi_icon'].length-1];
                        
                        media = match ? match : last;
                    }

                    if (sceneData['poi_label'] ){
                        var match = sceneData['poi_label'][connectionIndex];
                        var last = sceneData['poi_label'][sceneData['poi_label'].length-1];
                        
                        label = match ? match : last;
                    }

                    if (sceneData['poi_trace'] ){
                        var match = sceneData['poi_trace'][connectionIndex];
                        var last = sceneData['poi_trace'][sceneData['poi_trace'].length-1];
                        
                        trace = match ? match : last;
                    }

                    createMarker(map, frigg, connection, media, label);

                    
                    if (trace) {
                        var className = frigg.getClassForLinkSlot(connection);
                        if (className != 'closed-link') {
                            var traceStyle = sceneData.trace_style ? sceneData.trace_style[0] : null;
                            createTrace("poi_trace_" + connectionIndex, trace, traceStyle, map, frigg);
                        }
                    }

                }

            }.bind(this));

            

            map.on("zoomend", function(data){
                handleVisibility(map, frigg);
            });

            map.resize();
            handleVisibility(map, frigg);
            
        }
    }
}