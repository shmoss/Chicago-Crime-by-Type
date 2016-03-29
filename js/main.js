
//begin script when window loads
window.onload = setMap();



//set up the map
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

	//create Albers equal area conic projection centered on Chicago, Illinois
	var projection = d3.geo.albers()
		//set the central coordinates
        .center([0, 41.88]) 
        //set rotation 
        .rotate([87.623, 0, 0])
        //these are our standard parallels
        .parallels([40, 42])
        //let's make sure we can see Chicago
        .scale(50000)
        .translate([width / 2, height / 2]);
        
   	//this is our path generator function
	var path = d3.geo.path() 
        .projection(projection);
    //queue.js for data loading        
	var q = d3_queue.queue(); 
	q
         
		.defer(d3.csv, "data/crimeTotalsFinal.csv") //load attributes from csv
		.defer(d3.json, "data/Illinois_WGS_1984.topojson") //load background spatial data
		.defer(d3.json, "data/commAreas_WGS_1984.topojson") //load choropleth spatial data
		.await(callback);
	//once data loaded, callback function 
    //takes 4 parameters (including the above three data sources)		    
	function callback(error, csvData, background, communities){
		console.log(error);
        console.log(csvData);
        console.log(background);
        console.log(communities);
        
        //create graticule		
		var graticule = d3.geo.graticule()
			//place graticule lines every 5 degrees of longitude and latitude
            .step([0.5, 0.5]); 
        
        //create graticule background
        var gratBackground = map.append("path")
        	//bind graticule background
            .datum(graticule.outline()) 
            //assign class for styling
            .attr("class", "gratBackground") 
            //project graticule
            .attr("d", path) 
        
        //create graticule lines
        //select graticule elements that will be created
        var gratLines = map.selectAll(".gratLines") 
        	//bind graticule lines to each element to be created
            .data(graticule.lines())
            //create an element for each datum 
            .enter() 
            //append each element to the svg as a path element
            .append("path") 
            //assign class for styling
            .attr("class", "gratLines") 
            //project graticule lines
            .attr("d", path); 
		
		//translate community area and Illinois TopoJSON				
        var backgroundState = topojson.feature(background, background.objects.Illinois_WGS1984),
		   communityAreas = topojson.feature(communities, communities.objects.commAreas_WGS_1984).features;                       
        //add Illinois to map
        var state = map.append("path")
            .datum(backgroundState)
            .attr("class", "state")
            .attr("d", path);
     
        //add community regions to map
        var community = map.selectAll(".regions")
            .data(communityAreas)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "community " + d.community;
            })
            .attr("d", path);
    };
};

