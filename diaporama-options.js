
var getDiaporamaOptions = function(containerElement) {
    return {
        'containerElement': containerElement,
        'enableDrag': true,
        'updateOnResize': true,
        'mouseDragSpeedMultiplier': -1.1,
        'touchDragSpeedMultiplier': -0.8,
        'lastItemSnapRight': true,

        'autoPlayIntervalMs': 0,

        onChange: function(event) {
            containerElement.querySelector(".legendContainer").innerHTML = event.selectedItem.getAttribute("frigg-data");
        },

        onClick: function(event) {

            if (! needDiaporama(containerElement)) {
                return;
            }

            var className1 = "fullscreen-diaporama";
            var className2 = "fullview";

            if (containerElement.classList.contains(className1)) {
                containerElement.classList.toggle(className2);
            } else {
                containerElement.classList.add(className1);
            }

            event.diaporama.updateSizes();

        },

        forceItemWidthPercent: function(refSize){
            return 100;
        }
    }
};

var makeDiaporamaNav = function(containerElement, d) {

    if (! needDiaporama(containerElement)) {
        containerElement.querySelector(".diaporama-previous").classList.add("empty");
        containerElement.querySelector(".diaporama-next").classList.add("empty");

        return;
    }

    containerElement.querySelector(".diaporama-previous").addEventListener("click", function(event){
        d.movePrevious();
    });

    containerElement.querySelector(".diaporama-next").addEventListener("click", function(){
        d.moveNext();
    });

    containerElement.querySelector(".diaporama-close").addEventListener("click", function(event){
        containerElement.classList.remove("fullscreen-diaporama");
    });

};

var needDiaporama = function(containerElement){
    var items = containerElement.querySelectorAll(".diaporama .diapo-item");
    return (items.length > 1);
}

