let data;
let allData;
let width;
let color = d3.scaleOrdinal(d3.schemeCategory20);

$(document).ready(function(){

	width = parseInt(d3.select('#bubbles-svg').style('width'), 10);

	$("#billionaire-card").hide();
	$("#title").hide();
	$("#split-by-toggles").hide();

	// these switches split the data in certain ways, on check they pass a function argument to the splitHalf or splitQuarter function
    $("#inherited-check").find("input[type=checkbox]").on("change",function() {
        var checked = $(this).prop('checked');

        let xFunction = (d) => (d.generationofinheritance === '0')? ((2 * width / 3) - (width / 3)) : ((2 * width / 3) + (width / 5));

         if(checked) {
         	setSwitchesFalse();
	   		$(this).prop('checked', true);
			splitHalf(xFunction);
	    } else {
	    	join();
	    }
    });
    $("#emerging-check").find("input[type=checkbox]").on("change",function() {
        var checked = $(this).prop('checked');

         let xFunction = (d) => (d.countrycode === 'USA')? ((2 * width / 3) - (width / 2)) : ((2 * width / 3) + (width / 8));

         if(checked) {
         	setSwitchesFalse();
	   		$(this).prop('checked', true);
			splitHalf(xFunction);
	    } else {
	    	join();
	    }
    });
	$("#gender-check").find("input[type=checkbox]").on("change",function() {
        var checked = $(this).prop('checked');

        let xFunction = (d) => (d.gender === 'male')? ((2 * width / 3) - (width / 3)) : ((2 * width / 3) + (width / 5));

         if(checked) {
         	setSwitchesFalse();
	   		$(this).prop('checked', true);
			splitHalf(xFunction);
	    } else {
	    	join();
	    }
    });
    $("#founder-check").find("input[type=checkbox]").on("change",function() {
        var checked = $(this).prop('checked');

        let xFunction = (d) => (d.founder === '1')? ((2 * width / 3) - (width / 2)) : ((2 * width / 3) + (width / 6));

         if(checked) {
         	setSwitchesFalse();
	   		$(this).prop('checked', true);
			splitHalf(xFunction);
	    } else {
	    	join();
	    }
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
				  .force('x', d3.forceX().x(2 * width / 3))
				  .force('y', d3.forceY().y(350))
				  .force('collision', d3.forceCollide().radius((d) => parseInt(d.networthusbillion) + 1))
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
		let legend_data = Object.keys(industries).slice(0, Object.keys(industries).indexOf("Other"));
		legend_data.push("All");
		console.log(legend_data);
		d3.select("#legend-card-content").selectAll("div")
								.data(legend_data)
								.enter()
								.append("p")
								.text((d) => d)
								.style("background-color", (d) => color(industryColor(d)))
								.style('border-style', 'solid')
								.style('border-color', 'black')
								.style('border-width', '0px')
							    .on('mouseover', mouseoverLegend)
				    			.on('mouseout', mouseoutLegend)
				    			.on('click', clickLegend);
	}

	function ticked() {

		// select all circles already there
		let u = d3.select("#bubbles-svg").selectAll("circle").data(data);

		// remove all circles no longer associated with data
		u.exit().remove();

		// add new ones (for new data), merge with the old ones and update both of their positions
		u.enter().append("circle")
		 		.attr("r", (d) => parseFloat(d.networthusbillion))
				.attr("fill", (d) => {
					return color(industryColor(d.industry));
				})
			    .on('mouseover', mouseover)
			    .on('mouseout', mouseout)
				.merge(u)
				.attr('cx', (d) => d.x = Math.max(parseFloat(d.networthusbillion), Math.min(width - parseFloat(d.networthusbillion), d.x)))
			    .attr('cy', (d) => d.y = Math.max(parseFloat(d.networthusbillion), Math.min(800 - parseFloat(d.networthusbillion), d.y)));
	}

	function splitHalf(xFunction) {

		console.log(data);

		d3.forceSimulation(data)
						  .force('x', d3.forceX().x((d) => xFunction(d)))
						  .force('y', d3.forceY().y(350))
						  .force('collision', d3.forceCollide().radius((d) => parseInt(d.networthusbillion) + 1))
						  .on('tick', ticked);

	}

	function splitQuarters(xFunction, yFunction) {

	}

	function join() {

		d3.forceSimulation(data)
				  .force('x', d3.forceX().x(2 * width / 3))
				  .force('y', d3.forceY().y(350))
				  .force('collision', d3.forceCollide().radius((d) => parseInt(d.networthusbillion) + 1))
				  .on('tick', ticked);

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
		d3.select(this).style('border-width', '2px');
	}

	function mouseoutLegend(d, i) {
		d3.select(this).style('border-width', '0px');
	}

	function clickLegend(d, i) {
	/*	// remove irrelevant data
		
		data = allData.filter((a) => {
				return a.year === 2014;
			}).slice(0, 500);

		data = data.filter((a) => {
				return a.wealth.how.industry === "Energy";
			});

		buildSimulation(); */
	}

});

function setSwitchesFalse() {
	$('#inherited-check').find("input[type=checkbox]").prop('checked', false);
	$('#gender-check').find("input[type=checkbox]").prop('checked', false);
	$('#emerging-check').find("input[type=checkbox]").prop('checked', false);
	$('#founder-check').find("input[type=checkbox]").prop('checked', false);
}

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
		"NOR" : "no"
};