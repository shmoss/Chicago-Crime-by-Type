(function(){

//set our global variables
var attrArray = ["community", "pop_total", "Assaults", "Burglaries", "Sexual assaults", "Homicides", "Robberies", "ass_rel", "burg_rel", "crimSex_rel", "hom_rel", "robb_rel"]; //list of attributes
var expressed = attrArray[2]; //initial attribute
console.log(expressed)

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
	chartHeight = 473,
	leftPadding = 35,
	rightPadding = 2,
	topBottomPadding = 5,
	innerWidth = chartWidth - leftPadding - rightPadding,
	innerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
		
var yScale = d3.scale.linear()
	.range([463, 0])
	.domain([0, 200]);

//begin script when window loads
window.onload = setMap();


//set up the map
function setMap(){
    var width = window.innerWidth * 0.5, //dimensions
        height = 460; //dimensions

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Chicago, Illinois
    var projection = d3.geo.albers()
        .center([0, 41.85]) //set coordinates
        //set rotation 
        .rotate([87.623, 0, 0])
        //these are our standard parallels
        .parallels([40, 42])
        //let's make sure we can see Chicago
        .scale(62000)
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
		
        // console.log(csvData);
        // console.log(background);
        // console.log(communities);
        
         
		
	   
       var backgroundState = topojson.feature(background, background.objects.Illinois_WGS1984),  //translate community area and Illinois TopoJSON
		   communityAreas = topojson.feature(communities, communities.objects.commAreas_WGS_1984).features; 
		                        
        //add Illinois to map
        var state = map.append("path")
            .datum(backgroundState)
            .attr("class", "state")
            .attr("d", path);
     
		
        //console.log(communityAreas)
		//join csv data to GeoJSON enumeration units
		 communityAreas = joinData(communityAreas, csvData); 
		
		
		//create the color scale
		var colorScale = makeColorScale(csvData);

		//add enumeration units to the map
		setEnumerationUnits(communityAreas, map, path, colorScale);  
		
		setChart(csvData, colorScale); 
		
		//create dropdown for attribute selection
		createDropdown(csvData);        
    };

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
	//loop through csv to assign each set of csv attribute values to geojson community
	for (var i=0; i<csvData.length; i++){
		var csvCommunity = csvData[i]; //the current community
		var csvKey = csvCommunity.community; //the CSV key
		//loop through geojson regions to find correct community in order to match
		for (var a=0; a<communityAreas.length; a++){
			var geojsonProps = communityAreas[a].properties; //the current community geojson properties
			var geojsonKey = geojsonProps.community; //the geojson primary key
			//where keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){
				
				//assign all attributes and values
				attrArray.forEach(function(attr){					
					if (attr == "community") {
						// assign the community name here
						var val = csvCommunity[attr];
						//console.log(csvRegion[attr])
					}
					else {
						//here, if the object in the array is NOT "community", we'll parse numberical values
						var val = parseFloat(csvCommunity[attr]); //get csv attribute value
					}
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};

	return communityAreas;
	
};

function setEnumerationUnits(communityAreas, map, path, colorScale){
	
	
	//add communities to map
	var community = map.selectAll(".community")
		.data(communityAreas)		
		.enter()
		.append("path")
		.attr("class", function(d){ //assign class here
			//this will return the name of each community
			return "community " + d.properties.community;

			
		})
		.attr("d", path)
		.style("fill", function(d){
			//style applied based on choropleth function
			return choropleth(d.properties, colorScale);
		});
	console.log(community)
};

function makeColorScale(data){
	//assign color classes for choropleth
	var colorClasses = [
        "#fee5d9",
		"#fcae91",
		"#fb6a4a",
		"#de2d26",
		"#a50f15"
    ];

    //create color scale generator
    var colorScale = d3.scale.threshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
    	// use the value of expressed value in array
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

//function to look for data value and return color
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

//creates our bar chart based on csv data and color scale
function setChart(csvData, colorScale){


	//create a second svg element to hold the bar chart
	var chart = d3.select("body")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		//assign class
		.attr("class", "chart");

	//create a rectangle for chart background fill
	var chartBackground = chart.append("rect")
		.attr("class", "chartBackground")
		.attr("width", innerWidth)
		.attr("height", innerHeight)
		.attr("transform", translate);

	//create a scale to size bars proportionally to frame and for axis
	var yScale = d3.scale.linear()
		.range([463, 0])
		.domain([0, 200]);

	//set bars for each province
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		//use d3 method to sort the data based on expressed attribute
		.sort(function(a, b){
			return b[expressed]-a[expressed]
		})
		.attr("class", function(d){
			return "bar " + d.community;
		})
		.attr("width", innerWidth / csvData.length - 1)
		.attr("x", function(d, i){
			return i * (innerWidth / csvData.length) + leftPadding;
		})
		.attr("height", function(d, i){
			return 463 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		.style("fill", function(d){
			return choropleth(d, colorScale);
		})
		.on("mouseover", function(d){
            highlight(d.properties);
        });



	//create a text element for the chart title
	var chartTitle = chart.append("text")
		.attr("x", 40)
		.attr("y", 40)
		.attr("class", "chartTitle")


	//create vertical axis generator
	var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient("left");

	//place axis
	var axis = chart.append("g")
		.attr("class", "axis")
		.attr("transform", translate)
		.call(yAxis);

	//create frame for chart border
	var chartFrame = chart.append("rect")
		.attr("class", "chartFrame")
		.attr("width", innerWidth)
		.attr("height", innerHeight)
		.attr("transform", translate);
		
	//set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);		
};          
        
//end setChart function

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });


    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var community = d3.selectAll(".community")
    	.transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
        
	  //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
       
        
    updateChart(bars, csvData.length, colorScale);        
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (innerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        
	    //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " per 10,000 people");        
};

//function to highlight enumeration units and bars
//function to highlight enumeration units and bars
function highlight(props){
	//change stroke
	var selected = d3.selectAll("." + props.community)
		.style({
			"stroke": "blue",
			"stroke-width": "2"
		});

	setLabel(props);
};

})();