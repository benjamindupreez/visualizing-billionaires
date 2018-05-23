let data;
let allData;
let width;
let color = d3.scaleOrdinal(d3.schemeCategory20);

// holds up to two axis over which the data is currently split
let splitAxis = ["", ""];

$(document).ready(function(){

	width = parseInt(d3.select('#bubbles-svg').style('width'), 10);

	$("#billionaire-card").hide();
	$("#title").hide();
	$("#split-by-toggles").hide();

	/* if a switch was flipped -> call the appropriate functions to manipulate the data over the axis
	*/
    $(".switch").find("input[type=checkbox]").on("change",function() {

    	// get the id of the switch that was flicked (we use this to know what axis to add)
        let switchId = "#" + $(this).attr("switch-id");

        if($(this).prop('checked')) {
        	// add an axis and split the data over the current one or two axis
         	addAxis(switchId);
	    } else {
	    	// remove the 2nd axis
	    	removeAxis(switchId);
	    }

	    console.log(splitAxis);

     	// get the splitting functions from the flickes switches' id's and send it to split to manipulate the data
		split(splittingFunctions[splitAxis[0]], splittingFunctions[splitAxis[1]]);

    	// now show the appropriate axis on the visualization

    	d3.select("#bubbles-svg").selectAll("g").remove(); // clear the axis canvas
		let l = d3.select("#bubbles-svg").selectAll("g").data(splitAxis.filter((d) => d !== "")).enter().append("g");

		l.append("line")
				.attr("x1", (d, i) => (i == 0)? width / 2 : width / 16)
				.attr("x2", (d, i) => (i == 0)? width / 2 : 15 * width / 16)
				.attr("y1", (d, i) => (i == 0)? 50 : 400)
				.attr("y2", (d, i) => (i == 0)? 700 : 400)
				
		l.append("text")
				.attr("x", (d, i) => (i == 0)? (width / 2) - 10 : width / 16)
				.attr("y", (d, i) => (i == 0)? 60 : 390)
				.attr("fill", "white")
				.attr("text-anchor", (d, i) => (i == 0)? "end" : "start")
				.text((d, i) => splittingText[splitAxis[i]][0])
				
		l.append("text")
				.attr("x", (d, i) => (i == 0)? (width / 2) + 10 : width / 16)
				.attr("y", (d, i) => (i == 0)? 60 : 420)
				.attr("fill", "white")
				.text((d, i) => splittingText[splitAxis[i]][1])
				.append("text");

    });

	// LOAD DATA
	var data;

	// new https://gist.githubusercontent.com/benjamindupreez/7ff764dd20dbf295d38162eec4b567de/raw/f3f570ad83b3444dd362dfd063849727ca320847/billionairesV2.json
	// old https://gist.githubusercontent.com/benjamindupreez/5e807a4cc3c95b2b64529ed2c2396e29/raw/df04771defc2bdba1071cf004ea2780bb1595c8e/billionaires.json
	$.getJSON("https://gist.githubusercontent.com/benjamindupreez/7ff764dd20dbf295d38162eec4b567de/raw/c8303cc204414abb7fa0b2e5568f01c02a3a1dc5/billionairesV2.json").then((result) => {

		// LOAD JSON FROM WEB

		console.log(result);

		return new Promise((resolve, reject) => {

			// sort billionaires by rank and filter them by year
			data = result.sort((a, b) => {
				if(parseInt(a.rank) < parseInt(b.rank)) {
					return -1;
				}
				if (parseInt(a.rank) > parseInt(b.rank)) {
					return 1;
				}

				return 0;
			});

			allData = data;

			resolve();			
		});	

	}).then(() => {

		data = data.filter((a) => {
			return a.year === "2014";
		}).slice(0, 500);

		console.log(data);

		$("#loader").hide();
		$("#billionaire-card").show();
		$("#title").show();
		$("#split-by-toggles").show();

		// BUILD SIMULATION
		buildSimulation();

		showLegend();
		
	});

	function buildSimulation() {

		d3.forceSimulation(data)
				  .force('x', d3.forceX().x(width / 2))
				  .force('y', d3.forceY().y(400))
				  .force('collision', d3.forceCollide().radius((d) => radius(d) + 2))
				  .on('tick', ticked);


	  	// force the first billionaire to be shown
		d3.select("#name").text(data[0].rank + ". " + data[0].name + ((data[0].age === -1)? "" : (" (" + data[0].age + ")")));
		d3.select("#company").text(data[0].company + " (founded " + data[0].foundingdate + ")");
		d3.select("#wealth").text("Net worth: $" + data[0].networthusbillion + "B");
		d3.select("#country").text("Citizenship: " + data[0].citizenship);
		d3.select("#industry").text("Industry: " + data[0].industry);
		d3.select("#type").text("Type: " + data[0].typeofwealth);
		d3.select("#notes").text((data[0].notes)? ("Notes: " + data[0].notes) : "");
		d3.select("#flag").attr("src", "http://www.countryflags.io/" + getCountryCode(data[0]) + "/flat/64.png");

	}

	function showLegend() {
		// show legend
		let legend_data = Object.keys(industries);
		d3.select("#legend-card-content").selectAll("div")
								.data(legend_data)
								.enter()
								.append("p")
								.text((d) => d)
								.style("background-color", (d) => color(industryColor(d)))
							    .on('mouseover', mouseoverLegend)
				    			.on('mouseout', mouseoutLegend)
				    			.on('click', clickLegend);
	}

	// this function is called iteratively until the force layout has reached steady state
	function ticked() {

		// check if we're splitting over axis, and set the appropriate functions for cx and cy
		cx = (d) => Math.max(radius(d), Math.min(width - radius(d), d.x)); // default function (not splitting)
		cy = (d) => Math.max(radius(d), Math.min(800 - radius(d), d.y));

		// splitting horizontally
		if(splitAxis[0] !== "") {
			cx = (d) => splittingFunctions[splitAxis[0]](d)? Math.max(radius(d), Math.min(width/2 - radius(d), d.x)) :  Math.max(radius(d) + width/2, Math.min(width - radius(d), d.x));
		}
		// splitting vertically
		if(splitAxis[1] !== "") {
			cy = (d) => splittingFunctions[splitAxis[1]](d)? Math.max(radius(d), Math.min(400 - radius(d), d.y)) :  Math.max(radius(d) + 400, Math.min(800 - radius(d), d.y));
		}

		// select all circles already there
		let u = d3.select("#bubbles-svg").selectAll("circle").data(data);

		// remove all circles no longer associated with data
		u.exit().remove();

		// add new ones (for new data), merge with the old ones and update both of their positions
		u.enter().append("circle")
		 		.attr("r", (d) => radius(d))
				.attr("fill", (d) => {
					return color(industryColor(d.industry));
				})
			    .on('mouseover', mouseover)
			    .on('mouseout', mouseout)
				.merge(u)
				.attr('cx', (d) => d.x = cx(d))
			    .attr('cy', (d) => d.y = cy(d));
	}

	// calculates the bubble radius of a specified billionaire based on their wealth
	function radius(d) {
		return 3*Math.sqrt(parseFloat(d.networthusbillion));
	}

	// splits the data over the desired one or two axis'
	function split(xFunction, yFunction) {

		// split over 2 axis
		if(xFunction !== undefined && yFunction !== undefined) {

			// transition simulation (billionaires can cross axis)
			d3.forceSimulation(data)
					  .force('x', d3.forceX().x((d) => xFunction(d)? (width / 4) : (3 * width / 4)))
					  // if an y function is given split the data according to it, otherwise just set y coordinate = 400
					  .force('y', d3.forceY().y((d) => yFunction(d)? 200 : 600))
					  .force('collision', d3.forceCollide().radius((d) => radius(d) + 2))
					  .on('tick', ticked);

		}
		// split over 1 axis only
		else if(xFunction !== undefined) {

			// transition simulation (billionaires can cross axis)
			d3.forceSimulation(data)
					  .force('x', d3.forceX().x((d) => xFunction(d)? (width / 4) : (3 * width / 4)))
					  // if an y function is given split the data according to it, otherwise just set y coordinate = 400
					  .force('y', d3.forceY().y((d) => 400))
					  .force('collision', d3.forceCollide().radius((d) => radius(d) + 2))
					  .on('tick', ticked);

		}
		// join all data
		else {

			d3.forceSimulation(data)
				  .force('x', d3.forceX().x(width / 2))
				  .force('y', d3.forceY().y(400))
				  .force('collision', d3.forceCollide().radius((d) => radius(d)))
				  .on('tick', ticked);

		}
	}

	function mouseover(d, i) {
		console.log(d.name + " (" + d.networthusbillion + ")");
		d3.select(this).attr('stroke','black').attr('stroke-width', 5);

		d3.select("#name").text(d.rank + ". " + d.name + ((d.age === -1)? "" : (" (" + d.age + ")")));
		d3.select("#company").text(d.company + " (founded " + d.foundingdate + ")");
		d3.select("#wealth").text("Net worth: $" + d.networthusbillion + "B");
		d3.select("#country").text("Citizenship: " + d.citizenship);
		d3.select("#industry").text("Industry: " + d.industry);
		d3.select("#type").text("Type: " + d.typeofwealth);
		d3.select("#notes").text((d.notes)? ("Notes: " + d.notes) : "");

		d3.select("#flag").attr("src", "http://www.countryflags.io/" + getCountryCode(d) + "/flat/64.png")
	}

	function mouseout(d, i) {
		d3.select(this).attr('stroke','black').attr('stroke-width', 0);
	}

	function mouseoverLegend(d, i) {
		d3.select(this).style('font-weight', 'bold');
	}

	function mouseoutLegend(d, i) {
		d3.select(this).style('font-weight', 'normal');
	}

	function clickLegend(d, i) {

	}

	// adds an axis and, if two axis's were already chosen, removes the oldest one
	function addAxis(newAxis) {

		// update active axis: add checked switch to thefront of the array and untoggle the rest	
		if(splitAxis[0] === "") {
			splitAxis[0] = newAxis;
		} else if(splitAxis[1] === "") {
			splitAxis[1] = newAxis;
		} else {
			splitAxis.shift();
			splitAxis[1] = newAxis;
		}

		$('#inherited-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#inherited-check") !== -1);
		$('#gender-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#gender-check") !== -1);
		$('#american-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#american-check") !== -1);
		$('#founder-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#founder-check") !== -1);
	}

	// removes one of the current two axis
	function removeAxis(axisToRemove) {

		splitAxis.splice(splitAxis.indexOf(axisToRemove), 1);
		splitAxis.push("");

		$(axisToRemove).find("input[type=checkbox]").prop('checked', false);

	}

});

function industryColor(industry_name) {

	if(industries[industry_name]) {
		return industries[industry_name];
	} else {
		return industries["Other"];
	}

}

function getCountryCode(d) {
	return country_codes[d.countrycode];
}

// CONST DATA

// maps the dataset industry name to an index value used to assign each industry a color from the color scale
const industries = {
		'Media' : 0,
		'Technology-Computer' : 1,
		'Real Estate' : 2,
		'Consumer' : 3,
		'Retail, Restaurant' : 4,
		'Construction' : 5,
		'Energy' : 6,
		'Hedge funds' : 7,
		'Diversified financial' : 8,
		'Money Management' : 9,
		'Mining and metals' : 10,
		'Non-consumer industrial' : 11,
		'Technology-Medical' : 12,
		'Other': 13
};

// maps the switch id's to the appropriate evaluation functions
const splittingFunctions = {
	"#inherited-check" : (d) => d.generationofinheritance === '0',
	"#american-check" : (d) => d.countrycode === 'USA',
	"#gender-check" : (d) => d.gender === 'male',
	"#founder-check" : (d) => d.founder === '1'
}

// maps the switch id's to the appropriate axis text
const splittingText = {
	"#inherited-check" : ["Self-made", "Inherited"],
	"#american-check" : ["American", "International"],
	"#gender-check" : ["Male", "Female"],
	"#founder-check" : ["Founder", "Non-Founder"]
}

// maps the dataset country codes to the country codes used by the flags API
const country_codes = {
		"USA" : "us",
		"SAU" : "sa",
		"BRA" : "br",
		"DEU" : "de",
		"HKG" : "hk",
		"BHR" : "bh",
		"JPN" : "jp",
		"FRA" : "fr",
		"MEX" : "mx",
		"NLD" : "nl",
		"ESP" : "es",
		"ECU" : "ec",
		"PER" : "pe",
		"CHL" : "cl",
		"MYS" : "my",
		"PHL" : "ph",
		"ZAF" : "za",
		"TUR" : "tr",
		"THA" : "th",
		"CHE" : "ch",
		"ARG" : "ar",
		"COL" : "co",
		"Taiwan" : "tw",
		"CAN" : "ca",
		"KOR" : "kr",
		"IDN" : "id",
		"GBR" : "gb",
		"IND" : "in",
		"LBN" : "lb",
		"ITA" : "it",
		"GRC" : "gr",
		"VEN" : "ve",
		"SWE" : "se",
		"BEL" : "be",
		"KWT" : "kw",
		"IRL" : "ie",
		"AUS" : "au",
		"SGP" : "sg",
		"DNK" : "dk",
		"DEN" : "dk",
		"LIE" : "li",
		"ISR" : "il",
		"RUS" : "ru",
		"CHN" : "cn",
		"AUT" : "at",
		"NGA" : "ng",
		"UKR" : "ua",
		"POL" : "pl",
		"NZL" : "nz",
		"NOR" : "no",
		"AGO" : "ao"
};