
//begin script when window loads
window.onload = setMap();



//set up choropleth map
function setMap(){
	//map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
	var projection = d3.geo.albers()
        .center([0, 46.2])
        .rotate([-2, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);
        
	var path = d3.geo.path()
        .projection(projection);
        
	 var q = d3_queue.queue()
         q
		.defer(d3.csv, "data/crimeTotalsFinal.csv") //load attributes from csv
		.defer(d3.json, "data/Illinois_WGS.topojson") //load background spatial data
		.defer(d3.json, "data/commAreas.topojson") //load choropleth spatial data
		.await(callback);
        
	function callback(error, csvData, background, communities){
		console.log("hi!.")
		
		var graticule = d3.geo.graticule()
            .step([0.5, 0.5]); //place graticule lines every 5 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
        
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
		
		//translate europe TopoJSON
       var backgroundCounties = topojson.feature(background, background.objects.Illinois_WGS)
            communityAreas = topojson.feature(communities, communities.objects.commAreas).features
        //add Europe countries to map
        var counties = map.append("path")
            .datum(illCounties)
            .attr("class", "counties")
            .attr("d", path);
            console.log("hi!there")
     
        console.log(error);
        console.log(csvData);
        console.log(illinois);
        console.log(community);
        
            //add France regions to map
        var community = map.selectAll(".regions")
            .data(communityAreas)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "community " + d.properties.adm1_code;
            })
            .attr("d", path);
    };
};