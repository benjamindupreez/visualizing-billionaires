let data;
let width;
let color = d3.scaleOrdinal(d3.schemeCategory20);

// equals null if no billionaire is currently selected, otherwise it holds the billionaires data
let selectedBillionaire = null;

// holds up to two axis over which the data is currently split
let splitAxis = ["", ""];

// the variable holds a function through which the data is filtered (e.g. used to filter certain industries)
let dataFilteringFunction = (d) => true;

$(document).ready(function(){

	width = parseInt(d3.select('#bubbles-svg').style('width'), 10);

	$('.modal').modal();
	$('#credits-modal').modal('open');
	$("#billionaire-card").hide();
	$("#title").hide();
	$("#split-by-toggles").hide();

	///////////////////////////////////
	//// SWITCH HANDLING //////////////
	///////////////////////////////////
	// if a switch was flipped -> call the appropriate functions to manipulate the data over the axis
    $(".switch").find("input[type=checkbox]").on("click", function() {

    	// get the id of the switch that was flicked (we use this to know what axis to add)
        let switchId = "#" + $(this).attr("switch-id");

        if($(this).prop('checked')) {
        	// add an axis and split the data over the current one or two axis
         	addAxis(switchId);
	    } else {
	    	// remove one axis
	    	removeAxis(switchId);
	    }

     	// get the splitting functions from the flicked switches' id's and send it to split to manipulate the data
		split(splittingFunctions[splitAxis[0]], splittingFunctions[splitAxis[1]]);

    	// now show the appropriate axis' on the visualization

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

    ///////////////////////////////////////
	// LOAD DATA //////////////////////////
	///////////////////////////////////////
	var data;

	$.getJSON("https://gist.githubusercontent.com/benjamindupreez/e724102fc83225979b003f92d6f1486b/raw/78f8aba7bb4eec4c00c79bdf307f667675a18b82/billionairesV4.json").then((result) => {

		// LOAD JSON FROM WEB

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
		}).slice(0, 1000);

		$("#loader").hide();
		$("#billionaire-card").show();
		$("#title").show();
		$("#split-by-toggles").show();

		d3.select("#bubbles-svg").on("click", unclickBillionaire);

		split(); // build the simulation
		showLegend();

	  	// force the first billionaire to be shown
		d3.select("#name").text(data[0].rank + ". " + data[0].name + ((data[0].age === -1)? "" : (" (" + data[0].age + ")")));
		d3.select("#company").text(data[0].company + " (founded " + data[0].foundingdate + ")");
		d3.select("#wealth").text("Net worth: $" + data[0].networthusbillion + "B");
		d3.select("#country").text("Citizenship: " + data[0].citizenship);
		d3.select("#industry").text("Industry: " + data[0].industry);
		d3.select("#type").text("Type: " + data[0].typeofwealth);
		d3.select("#notes").text((data[0].notes)? ("Notes: " + data[0].notes) : "");
		d3.select("#link").attr("href", data[0].source.includes("http")? data[0].source : "").attr("target", "_blank").text(data[0].source.includes("http")? "Source" : "");
		d3.select("#flag").attr("src", "http://www.countryflags.io/" + getCountryCode(data[0]) + "/flat/64.png");
		
	});

	///////////////////////////////
	///// UI UTILITY FUNCTIONS ////
	///////////////////////////////
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

		// default functions (not splitting)
		cx = (d) => Math.max(radius(d), Math.min(width - radius(d), d.x));
		cy = (d) => Math.max(radius(d), Math.min(800 - radius(d), d.y));
		// splitting horizontally
		if(splitAxis[0] !== "") {
			cx = (d) => splittingFunctions[splitAxis[0]](d)? Math.max(radius(d), Math.min(width/2 - radius(d), d.x)) :  Math.max(radius(d) + width/2, Math.min(width - radius(d), d.x));
		}
		// splitting vertically
		if(splitAxis[1] !== "") {
			cy = (d) => splittingFunctions[splitAxis[1]](d)? Math.max(radius(d), Math.min(400 - radius(d), d.y)) :  Math.max(radius(d) + 400, Math.min(800 - radius(d), d.y));
		}

		// bind data using the billionaires name as key
		let u = d3.select("#bubbles-svg").selectAll("circle").data(data.filter((d) => dataFilteringFunction(d)), (d) => d.name.replace(/\s/g, ''));

		// remove all circles no longer associated with data
		u.exit().remove();

		// add new ones (for new data), merge with the old ones and update both of their positions
		u.enter().append("circle")
		 		.attr("r", (d) => radius(d))
				.attr("fill", (d) => {
					// apply the appropriate industry color
					return (selectedBillionaire === null || selectedBillionaire === d)? color(industryColor(d.industry)) : "#555555";
				})
				.on('click', clickBillionaire)
			    .on('mouseover', mouseover)
			    .on('mouseout', mouseout)
				.merge(u)
				.attr('cx', (d) => d.x = cx(d))
			    .attr('cy', (d) => d.y = cy(d));
	}

	// builds the simulation and splits the data over the desired one or two (or zero) axis'
	function split(xFunction, yFunction) {

		let dataToShow = data.filter((d) => dataFilteringFunction(d));

		// split over 2 axis
		if(xFunction !== undefined && yFunction !== undefined) {

			d3.forceSimulation(dataToShow)
					  .force('x', d3.forceX().x((d) => xFunction(d)? (width / 4) : (3 * width / 4)))
					  // if an y function is given split the data according to it, otherwise just set y coordinate = 400
					  .force('y', d3.forceY().y((d) => yFunction(d)? 200 : 600))
					  .force('collision', d3.forceCollide().radius((d) => radius(d) + 2))
					  .on('tick', ticked);

		}
		// split over 1 axis only
		else if(xFunction !== undefined) {

			d3.forceSimulation(dataToShow)
					  .force('x', d3.forceX().x((d) => xFunction(d)? (width / 4) : (3 * width / 4)))
					  // if an y function is given split the data according to it, otherwise just set y coordinate = 400
					  .force('y', d3.forceY().y((d) => 400))
					  .force('collision', d3.forceCollide().radius((d) => radius(d) + 2))
					  .on('tick', ticked);

		}
		// join all data
		else {

			d3.forceSimulation(dataToShow)
				  .force('x', d3.forceX().x(width / 2))
				  .force('y', d3.forceY().y(400))
				  .force('collision', d3.forceCollide().radius((d) => radius(d)))
				  .on('tick', ticked);

		}
	}

	// calculates the bubble radius of a specified billionaire based on their wealth
	function radius(d) {
		return 3*Math.sqrt(parseFloat(d.networthusbillion));
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
		$('#emerging-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#emerging-check") !== -1);
		$('#politicalconnection-check').find("input[type=checkbox]").prop('checked', splitAxis.indexOf("#politicalconnection-check") !== -1);
	}

	// removes one of the current two axis
	function removeAxis(axisToRemove) {

		splitAxis.splice(splitAxis.indexOf(axisToRemove), 1);
		splitAxis.push("");

		$(axisToRemove).find("input[type=checkbox]").prop('checked', false);

	}

	// the next two functions look up data from the dictionaries at the bottom of the code
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


	//////////////////////////////////
	// MOUSE EVENT HANDLING //////////
	//////////////////////////////////
	function mouseover(d, i) {

		d3.select(this).attr('stroke','black').attr('stroke-width', 5);

		if(selectedBillionaire === null) { // disable mouseover highlighting when a billionaire is in focus

			d3.select("#name").text(d.rank + ". " + d.name + ((d.age === -1)? "" : (" (" + d.age + ")")));
			d3.select("#company").text(d.company + " (founded " + d.foundingdate + ")");
			d3.select("#wealth").text("Net worth: $" + d.networthusbillion + "B");
			d3.select("#country").text("Citizenship: " + d.citizenship);
			d3.select("#industry").text("Industry: " + d.industry);
			d3.select("#type").text("Type: " + d.typeofwealth);
			d3.select("#notes").text((d.notes)? ("Notes: " + d.notes) : "");
			d3.select("#link").attr("href", d.source.includes("http")? d.source : "").attr("target", "_blank").text(d.source.includes("http")? "Source" : "");

			d3.select("#flag").attr("src", "http://www.countryflags.io/" + getCountryCode(d) + "/flat/64.png");
		}
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

	function clickBillionaire(d, i) {

		M.toast({html: 'You can remove the focus from ' + d.name + ' by clicking on the background', displayLength: 3000})
		
		d3.select(this).attr('stroke','black').attr('stroke-width', 5);

		d3.select("#name").text(d.rank + ". " + d.name + ((d.age === -1)? "" : (" (" + d.age + ")")));
		d3.select("#company").text(d.company + " (founded " + d.foundingdate + ")");
		d3.select("#wealth").text("Net worth: $" + d.networthusbillion + "B");
		d3.select("#country").text("Citizenship: " + d.citizenship);
		d3.select("#industry").text("Industry: " + d.industry);
		d3.select("#type").text("Type: " + d.typeofwealth);
		d3.select("#notes").text((d.notes)? ("Notes: " + d.notes) : "");
		d3.select("#link").attr("href", d.source.includes("http")? d.source : "").attr("target", "_blank").text(d.source.includes("http")? "Source" : "");

		d3.select("#flag").attr("src", "http://www.countryflags.io/" + getCountryCode(d) + "/flat/64.png");				

		selectedBillionaire = d;

		updateColors();

		// stops the background parent svg click handler from being called
		d3.event.stopPropagation();
	}

	// called when the background svg is clicked and cancels the focus on one billionaire
	function unclickBillionaire() {
		console.log('adsad');
		selectedBillionaire = null;
		updateColors();
	}

	function clickLegend(d, i) {
		// update the filtering function
		if(d === "All") {
			dataFilteringFunction = (dt) => true;
		} else {
			dataFilteringFunction = (dt) => dt.industry === d;
		}

		// update simulation
		split(splittingFunctions[splitAxis[0]], splittingFunctions[splitAxis[1]]);
	}

	function updateColors() {
		d3.select("#bubbles-svg").selectAll("circle").data(data.filter((d) => dataFilteringFunction(d)), (d) => d.name.replace(/\s/g, '')).attr("fill", (d) => {
					// apply the appropriate industry color
					return (selectedBillionaire === null || selectedBillionaire === d)? color(industryColor(d.industry)) : "#555555";
		});
	}

});

// CONST DICTIONARY DATA

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
		'Private equity/leveraged buyout': 13,
		'Other': 14,
		'All': 15
};

// maps the switch id's to the appropriate evaluation functions
const splittingFunctions = {
	"#inherited-check" : (d) => d.generationofinheritance === '0',
	"#american-check" : (d) => d.countrycode === 'USA',
	"#gender-check" : (d) => d.gender === 'male',
	"#founder-check" : (d) => d.founder === '1',
	"#politicalconnection-check" : (d) => d.politicalconnection === '1',
	"#emerging-check" : (d) => d.north === '0'
}

// maps the switch id's to the appropriate axis text
const splittingText = {
	"#inherited-check" : ["Self-made", "Inherited"],
	"#american-check" : ["American", "International"],
	"#gender-check" : ["Male", "Female"],
	"#founder-check" : ["Founder", "Non-Founder"],
	"#politicalconnection-check" : ["Political Connection", "No Political Connection"],
	"#emerging-check" : ["Emerging Market", "Advanced Economy"]
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
		"AGO" : "ao",
		"PRT" : "pt",
		"DZA" : "dz",
		"ARE" : "ae",
		"EGY" : "eg",
		"MAR" : "ma",
		"GEO" : "ge",
		"CZE" : "cz",
		"SWZ" : "sz"
};