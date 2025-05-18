/* globals Chart:false */

//--------------------Checkboxes----------------------

let checkboxStates
//------------Leaflet map-----------------------
var map = L.map('map').setView([40.6501, -73.94958], 12);

//Add two basemaps
//First, create two variables of the basemaps
var arcImg = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {attribution: 
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"});

  var osm = L.tileLayer('https://tile.openstreetmap.bzh/ca/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles courtesy of <a href="https://www.openstreetmap.cat" target="_blank">Breton OpenStreetMap Team</a>'
});

//Add these to the map
osm.addTo(map);
arcImg.addTo(map);

//Create an object var of both basemaps
var baseMaps = {
  "Open Street Maps" : osm,
  "ESRI Satellite Imagery" : arcImg
}

//Add two geojson layers to the map
//Layer 2: community districts empty, styled
var districts = L.geoJSON(null, {
  style: function (feature) { return { 
      color: "white", 
      fill: "white", 
      fillOpacity:0, 
      weight:1};
  }
  }).addTo(map);


//Create the table
        var table = new Tabulator("#table_div", {
            height:300, 
            data: null,
            layout:"fitColumns",
            columns:[	 	
            {title:"Date", field:"Formatted"},
            {title:"Address", field:"IncidentAdd", hozAlign:"left"},
            {title:"Complaint", field: "Complaint", hozAlign:"left"},
            {title: "Description", field: "Descript2", hozAlign:"left"},
            ]
        });


//add the districts data
      fetch("./boundaries.json").then(
        function(response) {return response.json();}
      ).then(function(data){
        districts.addData(data);
      });
 

//Layer 1: 311 calls empty, styled
// The filter part goes through each row of geojson data, grabs its year
//and checks if that year is in the checkboxStates.years array
//if it is, it returns true and that row of data (or leaflet layer) is filtered into
//the set that will be added to the map
var points311 = L.geoJSON(null, {
  style: function (f, l) { return { 
      color: '#caf0f8', 
      fill: '#caf0f8', 
      weight:1.5, 
      opacity:.6,
      fillOpacity:.4};
  },
  pointToLayer: function(geoJsonPoint, latlng) {
  return L.circleMarker(latlng, {radius: 4});
  },
  onEachFeature: (f, l) => {
  l.bindPopup("Date: " + f.properties.Formatted + "</br> Address: " + f.properties.IncidentAdd + "</br> Complaint: " + f.properties.Descript2);
  }
  }).addTo(map);

  //Create an object var of both layers
  var overlayMaps = {
    "311 Calls" : points311,
   "Community Districts" : districts
  }

//Now create a layer control object and add the basemaps obj var to that. 
  var layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false, hideSingleBase: true }).addTo(map).expand();

//This is the function that gets the updated array of checked boxes. For each checked input, this looks at its class (year, por ejemplo) and if
//if matches the case, it adds the value (2010, eg) it to the checkboxStates.years array
//So after this, the array will contain the list of years that are checked.
  function updateCheckboxStates() {
    checkboxStates = {
      years: [],
      problems: []
    }
    
    for (let input of document.querySelectorAll('input')) {
      if(input.checked) {
        switch (input.className) {
           case 'problem-type': checkboxStates.problems.push(input.value); break
           case 'year': checkboxStates.years.push(parseInt(input.value, 10)); break
        }
      }
    }
    console.log("Checkbox states:", checkboxStates); // Debugging output
  }


//Function to check the array to the features and remove features not in the array
function filterVisiblePoints(){  
  points311.getLayers().forEach( (l) => {
    const feature =l.feature;

    const year = feature.properties.Year;
    const isYearChecked = checkboxStates.years.includes(year);

    const problem = feature.properties.Descript2.trim();
    const isProblemTypeChecked = checkboxStates.problems.includes(problem);

    if(isYearChecked && isProblemTypeChecked) {
        l.addTo(map);
    } else {
        l.removeFrom(map);
    }
  });
} 

//Function to filter the rows based on checkboxes
function filterRows() {
  table.setFilter(function(data) {
    // data: the row data (properties)
    const year = data.Year;
    const problem = data.Descript2 && data.Descript2.trim();

    const isYearChecked = checkboxStates.years.includes(year);
    const isProblemTypeChecked = checkboxStates.problems.includes(problem);

    return isYearChecked && isProblemTypeChecked;
  });
}



//This is the event listener. 
  for (let input of document.querySelectorAll('input')) {
    //Listen to 'change' event of all inputs
    input.onchange = (e) => {
      //see which boxes are checked
       updateCheckboxStates();
      //filter out markers not in the array
       filterVisiblePoints();
       filterRows();
    }
  }

//Clicking the row highlights the corresponding point
let highlightMarker

table.on("rowClick", function(e, row){
  const rowData = row.getData();

  const lat = rowData.Latitude
  const long = rowData.Longitude

  if (highlightMarker) {
    map.removeLayer(highlightMarker);
  }

  highlightMarker = L.circleMarker([lat, long],{
      radius: 8,
      color: "#ff0000",
      fillColor: "#ff0000",
    }).addTo(map);
  map.setView([lat, long], 16); 
    },
);


 /****** INIT ******/
 updateCheckboxStates()
 fetch("./HeavyRain311CallsCleaned.geojson")
  .then((response) => response.json()) // Parse the JSON data
  .then((data) => {
    points311.addData(data); // Add the GeoJSON data to the layer

    let attrTable = new Array(data.features.length).fill(null);

            data.features.forEach((v, i) => {
              attrTable[i] = v.properties;
            });

            table.addData(attrTable);
  });




//--------------Search bar-----------------

 // https://github.com/stefanocudini/leaflet-search
 var searchControl = new L.Control.Search({
  layer: points311,
  propertyName: "IncidentAdd",
  textPlaceholder:"Search for an Address",
  circleMarker : {
      radius: 8,
      color: "#ff0000",
      fillColor: "#ff0000",
    },
  moveToLocation: function (latlng, title, map) {
    console.log("moveToLocation called!", latlng, title, map);
    map.setView(latlng, 16); 
    },
});

map.addControl(searchControl); //inizialize search control

/** 
var osmGeocoderControl = new L.Control.Search({
  url: "https://nominatim.openstreetmap.org/search?format=json&q={s}&countrycodes=us",
  jsonpParam: "json_callback",
  propertyName: "display_name",
  propertyLoc: ["lat", "lon"],
  textPlaceholder:"Search any place name or address in USA",
  marker: L.circleMarker([0, 0], { radius: 30 }),
  autoCollapse: true,
  autoType: false,
  minLength: 2,
  position: "bottomleft",
  container: "",
  moveToLocation: (latlng, name, map) => {
    USstatesLayerB.eachLayer((l) => {
      console.log(Date.now());
      if (
        turf.booleanPointInPolygon(
          turf.point([latlng.lng, latlng.lat]),
          l.feature
        )
      ) {
        l.setStyle({ fillColor: "#555" });
        return;
      }
    });

    map.setView(latlng, 6);
  },
});

map.addControl(osmGeocoderControl);*/


//------------------------Existing graph code-------------
(() => {
  'use strict'

  // Graphs
  const ctx = document.getElementById('myChart')
  // eslint-disable-next-line no-unused-vars
  const myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ],
      datasets: [{
        data: [
          15339,
          21345,
          18483,
          24003,
          23489,
          24092,
          12034
        ],
        lineTension: 0,
        backgroundColor: 'transparent',
        borderColor: '#007bff',
        borderWidth: 4,
        pointBackgroundColor: '#007bff'
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          boxPadding: 3
        }
      }
    }
  })
})()
