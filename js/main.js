(function(){

//begin script when window loads
window.onload = setMap();

//set our global variables
var attrArray = ["community", "pop_total", "ass_ind", "burg_ind", "crimSex_ind", "hom_ind", "robb_ind", "ass_rel", "burg_rel", "crimSex_rel", "hom_rel", "robb_rel"]; //list of attributes
var expressed = attrArray[3]; //initial attribute

//set up the map
function setMap(){
    var width = 960, //dimensions
        height = 460; //dimensions

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Chicago, Illinois
    var projection = d3.geo.albers()
        .center([0, 41.88]) //set coordinates
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
		//get data from these files
		.defer(d3.csv, "data/crimeTotalsFinal.csv") //load attributes from csv
		.defer(d3.json, "data/Illinois_WGS_1984.topojson") //load background spatial data
		.defer(d3.json, "data/commAreas_WGS_1984.topojson") //load choropleth spatial data
		.await(callback);

    //once data loaded, callback function
    //takes 4 parameters (including the above three data sources) 
	function callback(error, csvData, background, communities){
		
		//place graticule on the map
		setGraticule(map, path);
		
        console.log(csvData);
        console.log(background);
        console.log(communities);
        
         
		
	   
       var backgroundState = topojson.feature(background, background.objects.Illinois_WGS1984),  //translate community area and Illinois TopoJSON
		   communityAreas = topojson.feature(communities, communities.objects.commAreas_WGS_1984).features;                       
        //add Illinois to map
        var state = map.append("path")
            .datum(backgroundState)
            .attr("class", "state")
            .attr("d", path);
     

            
		//join csv data to GeoJSON enumeration units
		communityAreas = joinData(communityAreas, csvData); 
		
		
		//create the color scale
		var colorScale = makeColorScale(csvData);

		//add enumeration units to the map
		setEnumerationUnits(communityAreas, map, path, colorScale);           
    };

function setGraticule(map, path){
		console.log("setGraticule function")
		//create graticule
        var graticule = d3.geo.graticule()
            .step([0.5, 0.5]); //place graticule lines every 5 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            //assign class for styling
            .attr("class", "gratBackground") 
            //project graticule
            .attr("d", path) 
        
        //create graticule lines
        //select graticule elements that will be created
        var gratLines = map.selectAll(".gratLines") 
            .data(graticule.lines()) //bind graticule lines to each element to be created
            //create an element for each datum 
            .enter() 
            //append each element to the svg as a path element
            .append("path") 
            //assign class for styling
            .attr("class", "gratLines") 
            //project graticule lines
            .attr("d", path);
};
  
function joinData(communityAreas, csvData){
	console.log("yo")
	//loop through csv to assign each set of csv attribute values to geojson region
	for (var i=0; i<csvData.length; i++){
		var csvRegion = csvData[i]; //the current region
		var csvKey = csvRegion.community; //the CSV primary key

		//loop through geojson regions to find correct region
		for (var a=0; a<communityAreas.length; a++){

			var geojsonProps = communityAreas[a].properties; //the current region geojson properties
			var geojsonKey = geojsonProps.community; //the geojson primary key
			
			//where primary keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){

				//assign all attributes and values
				attrArray.forEach(function(attr){
					var val = parseFloat(csvRegion[attr]); //get csv attribute value
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};

	return communityAreas;
	
};

function setEnumerationUnits(communityAreas, map, path, colorScale){
	
	//add France regions to map
	var community = map.selectAll(".community")
		.data(communityAreas)
		.enter()
		.append("path")
		.attr("class", function(d){
			console.log("hi")
			return "community " + d.properties.community;
		})
		.attr("d", path)
		.style("fill", function(d){
			return choropleth(d.properties, colorScale);
		});
	
};

function makeColorScale(data){
	var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scale.threshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;	
};

//function to test for data value and return color
function choropleth(props, colorScale){
	//make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	//if attribute value exists, assign a color; otherwise assign gray
	if (val && val != NaN){
		return colorScale(val);
	} else {
		return "#CCC";
	};
};

};

})();