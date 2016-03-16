//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use queue.js to parallelize asynchronous data loading
    queue()
        .defer(d3.csv, "data/attributes.csv") //load attributes from csv
        .defer(d3.json, "data/commAreas.topojson") //load background spatial data
        .defer(d3.json, "data/commAreas.topojson") //load choropleth spatial data
        .await(callback);
};