(function () {

  // mapbox API access Token
    L.mapbox.accessToken = 'pk.eyJ1Ijoia2FmdW5rIiwiYSI6ImNqYmc3dXJzczMzZWIzNHFmcmZuNjY3azMifQ.9i48EOQl4WCGZQqKRvuc_g';

  // instantiate map, centered on Kenya
  var map = L.mapbox.map('map')
    .setMaxBounds(L.latLngBounds([-6.22, 27.72], [5.76, 47.83]))
    .setMinZoom(6)
    .setMaxZoom(10);

  // add Mapbox Studio styleLayer
  L.mapbox.styleLayer('mapbox://styles/kafunk/cjgmqqkiq004r2rqwihmtdj04').addTo(map);

  // use omnivore to load the CSV data
  omnivore.csv('data/kenya_education_2014.csv')
    .on('ready', function (e) {
      // pass data as GeoJSON to drawMap function
      drawLegend(e.target.toGeoJSON());
      drawMap(e.target.toGeoJSON());
    })
    .on('error', function (e) {
      console.log(e.error[0].message);
    });

  function drawLegend(data) {
    var legendControl = L.control({
      position: 'bottomright'
    });

    // when the control is added to the map
    legendControl.onAdd = function (map) {
      // select the legend using id attribute of legend
      var legend = L.DomUtil.get("legend");
      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(legend);
      L.DomEvent.disableClickPropagation(legend);
      // return the selection
      return legend;
    }
    legendControl.addTo(map);

    var dataValues = data.features.map(function (school) {
      // for each grade in a school
      for (var grade in school.properties) {
        // shorthand to each value
        var value = school.properties[grade];
        // if the value can be converted to a number
        if (+value) {
          //return the value to the array
          return +value;
        }
      }
    });

    // verify your results!
    // console.log(dataValues);

    // sort our array
    var sortedValues = dataValues.sort(function(a, b) {
      return b - a;
    });

    // round the highest number and use as our large circle diameter
    var maxValue = Math.round(sortedValues[0] / 1000) * 1000;

    // calc the diameters
    var largeDiameter = calcRadius(maxValue) * 2,
        smallDiameter = largeDiameter / 2;

    // select our circles container and set the height
    $(".legend-circles").css('height', largeDiameter.toFixed());

    // set width and height for large circle
    $('.legend-large').css({
      'width': largeDiameter.toFixed(),
      'height': largeDiameter.toFixed()
    });

    // set width and height for small circle and position
    $('.legend-small').css({
      'width': smallDiameter.toFixed(),
      'height': smallDiameter.toFixed(),
      'top': largeDiameter - smallDiameter,
      'left': smallDiameter / 2
    })

    // label the max and median value
    $(".legend-large-label").html(maxValue.toLocaleString());
    $(".legend-small-label").html((maxValue / 2).toLocaleString());

    // adjust the position of the large based on size of circle
    $(".legend-large-label").css({
      'top': -12,
      'left': largeDiameter + 28,
    });

    // adjust the position of the large based on size of circle
    $(".legend-small-label").css({
      'top': smallDiameter - 12,
      'left': largeDiameter + 28
    });

    // insert a couple hr elements and use to connect value label to top of each circle
    $("<hr class='large'>").insertBefore(".legend-large-label")
    $("<hr class='small'>").insertBefore(".legend-small-label").css('top', largeDiameter - smallDiameter - 8);

  }
  
  // drawMap function to receive data from omnivore
  function drawMap(data) {

    // declare default options
    var options = {
      pointToLayer: function(feature,layer) {
        return L.circleMarker(layer, {
          opacity: 1,
          weight: 2,
          fillOpacity: 0,
        });
      }
    }

    // create 2 separate layers from same geoJSON data
    var girlsLayer = L.geoJson(data,options).addTo(map),
       boysLayer = L.geoJson(data,options).addTo(map);

    // fit map bounds to data
    map.fitBounds(boysLayer.getBounds(),{
      paddingBottomRight: [18,18]
    });

    // assign colors to diff layers
    girlsLayer.setStyle({
      color: 'tomato',
      fillColor: '#b04972' //fillColor will be invisible except on mouseover
    });
    boysLayer.setStyle({
      color: '#483597',
      fillColor: '#b04972' // fillColor will be invisible except on mouseover
    });

    // pass hard-coded grade level along with girls/boys layers
    resizeCircles(girlsLayer,boysLayer,1);
    sequenceUI(girlsLayer,boysLayer);
  }

  // akin to updateMap()
  function resizeCircles(girlsLayer,boysLayer,currentGrade) {
    girlsLayer.eachLayer(function(layer){
      var radius = calcRadius(Number(layer.feature.properties['G' + currentGrade]));
      layer.setRadius(radius);
    });
    boysLayer.eachLayer(function(layer){
      var radius = calcRadius(Number(layer.feature.properties['B' + currentGrade]));
      layer.setRadius(radius);
    });

    // update hover window with data from currentGrade
      // only need to pass boysLayer for mouseover purposes
    retrieveInfo(boysLayer,currentGrade);

  }

  function calcRadius(val) {
    var radius = Math.sqrt(val / Math.PI);
    return radius * .5; // adjust .5 as a scale factor
  }

  function sequenceUI(girlsLayer,boysLayer) {
    // create Leaflet control for the UI slider
    var sliderControl = L.control({position: 'bottomleft'}),
          sliderLabel = L.control({position: 'bottomleft'});

    sliderControl.onAdd = function(map) {
      // select relevant html elements using given id
      var controls = L.DomUtil.get("slider");

      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(controls);
      L.DomEvent.disableClickPropagation(controls);

      // return the selection
      return controls;
    }

    // do the same thing for sliderLabel
    sliderLabel.onAdd = function(map) {

      var sliderTxt = L.DomUtil.get("slider-txt");

      L.DomEvent.disableScrollPropagation(sliderTxt);
      L.DomEvent.disableClickPropagation(sliderTxt);

      return sliderTxt;
    }

    sliderControl.addTo(map);

    sliderLabel.addTo(map);


    // ----- listen and wait for slider change event -----

    $('#slider input[type=range]')
      .on('input', function () {

        // save new slider value as currentGrade
        var currentGrade = this.value;

        // update sliderTxt element
        $('#slider-txt span').html(currentGrade);

        // resize the circles with updated grade level
        resizeCircles(girlsLayer,boysLayer,currentGrade);

      });
  }

  function retrieveInfo(boysLayer,currentGrade) {

    // select the element and reference with variable
    // and hide it from view initially
    var info = $('#info').hide();

    // since boysLayer is on top, use to detect mouseover events
    boysLayer.on('mouseover', function (e) {

      // remove the none class to display and show
      info.show();

      // access properties of target layer
      var props = e.layer.feature.properties;

      // populate HTML elements with relevant info
      $('#info h3 span:first-child').html(props.COUNTY);
      $(".girls span:nth-child(2n)").html('Grade ' + currentGrade);
      $(".boys span:nth-child(2n)").html('Grade ' + currentGrade);
      $(".girls span:last-child").html(Number(props['G' + currentGrade]).toLocaleString());
      $(".boys span:last-child").html(Number(props['B' + currentGrade]).toLocaleString());

      // raise opacity level as visual affordance
      e.layer.setStyle({
        fillOpacity: .4
      });

    // Sparkline content
      // empty arrays for boys and girls values
      var girlsValues = [],
        boysValues = [];

      // loop through the grade levels and push values into those arrays
      for (var i = 1; i <= 8; i++) {
        girlsValues.push(props['G' + i]);
        boysValues.push(props['B' + i]);
      }

      $('.girlspark').sparkline(girlsValues, {
        width: '200px',
        height: '30px',
        lineColor: '#fa8253',
        fillColor: 'tomato',
        spotRadius: 0,
        lineWidth: 2
      });

      $('.boyspark').sparkline(boysValues, {
        width: '200px',
        height: '30px',
        lineColor: '#6a3e92',
        fillColor: '#483597',
        spotRadius: 0,
        lineWidth: 2
      });

    });

  // Mouseout
    // hide the info panel when mousing off layergroup and remove affordance opacity
    boysLayer.on('mouseout', function(e) {

      // hide the info panel
      info.hide();

      // reset the layer style
      e.layer.setStyle({
        fillOpacity: 0
      });
    });

    // when the mouse moves on the document
    $(document).mousemove(function(e) {
      // first offset from the mouse position of the info window
      info.css({
        "left": e.pageX + 6,
        "top": e.pageY - info.height() - 25
      });

      // if it crashes into the top, flip it lower right
      if (info.offset().top < 4) {
        info.css({
          "top": e.pageY + 15
        });
      }
      // if it crashes into the right, flip it to the left
      if (info.offset().left + info.width() >= $(document).width() - 40) {
        info.css({
          "left": e.pageX - info.width() - 80
        });
      }
    });
  }

})();
