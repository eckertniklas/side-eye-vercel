var trip = {};
var tracking = false;
var trackpoints = [];
var markedpoints = [];

// save ip address
$.getJSON("https://api.ipify.org/?format=json", function (e) {
	trip["ip_address"] = e.ip;
	console.log(e.ip);
});

// save input from pop-up window
function saveInput() {
	// save user input
	trip["name"] = document.getElementById("name").value;
	trip["transportMode"] = document.getElementById("transportMode").value;

	// reset form
	document.getElementById("name").value = "";
	document.getElementById("transportMode").value = "";

	// close the popup
	document.getElementById("popup").style.display = "none";
}

function getTimestamp() {
	
	// Timestamp in seconds
	var ts = new Date();
	console.log(ts.toLocaleTimeString());
	// Convert to PostgreSQL-Timestamp
	var date = ts.toLocaleDateString();
	if (date.length == 9) {
		date = '0' + date;
	}
	//console.log(date);
	var time = date.slice(6); // yyyy
	time = time.concat('-');
	time = time.concat(date.slice(3, 5)); // mm
	time = time.concat('-');
	time = time.concat(date.slice(0, 2)); // dd
	time = time.concat(' ')
	time = time.concat(ts.toLocaleTimeString()); // hh:mm:ss
	//console.log(time)

	return time;
}


$(document).ready(function () {
	console.log("ready!");


	// create and display map --------------------------------------------------------------------


	var map = L.map('map', { zoomControl: false }).setView([46.79851, 8.23173], 6);

	L.tileLayer('https://api.maptiler.com/maps/ch-swisstopo-lbm/{z}/{x}/{y}.png?key=5GIyaQiOX7pA9JBdK5R8', {
		minZoom: 2,
		maxZoom: 20,
		attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		ext: 'png'
	}).addTo(map);

	map.locate({ setView: true, maxZoom: 16 });

	var locationCircle;

	// brauchen wir das???
	function onLocationFound(e) {
		var radius = e.accuracy;

		if (locationCircle) {
			// update position and radius if location circle exists
			locationCircle.setLatLng(e.latlng);
			locationCircle.setRadius(radius);
			console.log("Position aktualisiert!");
		} else {
			// create new location circle if not
			locationCircle = L.circle(e.latlng, radius).addTo(map);
		}
	}
	map.on('locationfound', onLocationFound);
	function onLocationError(e) {
		alert(e.message);
	}
	map.on('locationerror', onLocationError);


	// location tracking: ---------------------------------------------------------------


	function geoSuccess(position) {
		// call the current position
		var latlng = L.latLng(position.coords.latitude, position.coords.longitude);
		var accuracy = position.coords.accuracy;
		// update location circle
		if (locationCircle) {
			locationCircle.setLatLng(latlng);
			locationCircle.setRadius(accuracy);
		} else {
			locationCircle = L.circle(latlng, accuracy).addTo(map);
		}
		// save position when in tracking mode
		if (tracking) {
			trackpoints.push(latlng)
			console.log("position logged");
		}
	}
	function geoError(error) {
		// handle errors
		console.error("Fehler bei der Geolokalisierung:", error);
	}
	geoOptions = {
		// options
		enableHighAccuracy: false,
		maximumAge: 15000,  // The maximum age of a cached location (15 seconds).
		timeout: 30000   // A maximum of 30 seconds before timeout.
	}

	// activate geolocation tracking
	var watchID = navigator.geolocation.watchPosition(geoSuccess, geoError, geoOptions);

	// end location tracking
	// // navigator.geolocation.clearWatch(watchID);



	// buttons -----------------------------------------------------------------------------


	// startstop button: (de)activate tracking---------------------------------------------
	function startStopButton() {
		var buttonElement = document.getElementById("button");
		// start tracking
		if (buttonElement.innerHTML === "Start") {
			// change button
			buttonElement.innerHTML = "Stop";
			buttonElement.style.backgroundColor = "#000";
			// enable tracking
			tracking = true;
			console.log("now tracking");

			var dotElement = document.createElement("div");
			dotElement.id = "trackingDot";
			dotElement.style.width = "10px";
			dotElement.style.height = "10px";
			dotElement.style.backgroundColor = "red";
			dotElement.style.borderRadius = "50%";
			dotElement.style.position = "fixed";
			dotElement.style.top = "10px";
			dotElement.style.right = "10px";
			dotElement.style.animation = "blinking 2s infinite"; // Define a blinking animation
			document.body.appendChild(dotElement);
		}
		// stop tracking
		else {
			// change button
			buttonElement.innerHTML = "Start";
			buttonElement.style.backgroundColor = '#444444';
			// remove tracking dot
			var dotElement = document.getElementById("trackingDot");
			if (dotElement) {
				dotElement.parentNode.removeChild(dotElement);
			}
			// pop-up window
			document.getElementById("popup").style.display = "flex";
			// close pop-up
			document.getElementById("evaluateTrip").addEventListener("click", function () {
				// get timestamp
				trip["date_of_collection"] = getTimestamp();
				// upload trip data and marked points
				console.log(trackpoints);
				//console.log(trackpoints[0]['lat']);
				insertData_trip(trackpoints, trip);
				//insertData_points(markedpoints, trip); ----> Noch nicht fertig implementiert (s.unten)
				// stop tracking
				tracking = false;
				console.log("stopped tracking");
				// reset
				trackpoints = [];
				markedpoints = [];
				trip = {};
				document.getElementById("popup").style.display = "none";
			});

		}
	}

	// CSS animation for blinking
	var style = document.createElement('style');
	style.innerHTML = `
    @keyframes blinking {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
	document.head.appendChild(style);
	// add onclick-event to the button
	var button = document.getElementById("button");
	button.onclick = startStopButton;



	// locating button: center map at current location---------------------------------------
	function locatingButton() {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(function (position) {
				var lat = position.coords.latitude;
				var lng = position.coords.longitude;
				var zoomLevel = 16;
				map.setView([lat, lng], zoomLevel);
				console.log("center");
			});
		} else {
			alert("Geolocation is not supported by your browser.");
		}
	}
	// add onclick-event to the button
	var locateButton = document.getElementById("locateButton");
	locateButton.onclick = locatingButton;

	// draw button: mark interesting point-------------------------------------------------------
	function markingButton() {
		if ("geolocation" in navigator) {
			if (tracking) {

			}
			navigator.geolocation.getCurrentPosition(function (position) {
				markedpoints.push([position.coords.latitude, position.coords.longitude, getTimestamp()]);
				console.log("point marked successfully");
				console.log(markedpoints);
			});
		} else {
			alert("Geolocation is not supported by your browser.");
		}
	}
	// add onclick-event to the button
	var markPointButton = document.getElementById("drawButton");
	markPointButton.onclick = markingButton;


	// upload to database: -----------------------------------------------------------------------

	var gs = {
		wfs: 'http://ikgeoserv.ethz.ch:8080/geoserver/GTA23_project/wfs',
		ows: 'http://ikgeoserv.ethz.ch:8080/geoserver/GTA23_project/ows'
	};


	function insertData_trip(trackpoints, trip) {
		ip_address = trip["ip_address"];
		date_of_collection = trip["date_of_collection"];
		//date_of_collection = "2023-12-01 17:20:38";
		trip_name = trip["name"];
		trip_transport_mode = trip["transportMode"];
		//var bspStringCoords = '8.50805,47.40918 8.50499,47.40520 8.50345,47.40432 8.50312,47.40361 8.50176,47.40279 8.49995,47.40294 8.49910,47.40161';
		var lineStringCoords = '';

		// ! LineString must have at least 2 points ! -> implement assertion or error message if only one point
		for (const tupel of trackpoints) {
			lineStringCoords = lineStringCoords.concat(tupel['lng']);
			lineStringCoords = lineStringCoords.concat(',');
			lineStringCoords = lineStringCoords.concat(tupel['lat']);
			lineStringCoords = lineStringCoords.concat(' ');
		}
		lineStringCoords = lineStringCoords.substr(0, lineStringCoords.length - 1);
	

		// test
		console.log(date_of_collection);
		console.log(lineStringCoords);
		console.log(trip_name);
		console.log(trip_transport_mode);
		console.log(ip_address);
		console.log(lineStringCoords);

		let postData =
			'<wfs:Transaction\n'
			+ 'service="WFS"\n'
			+ 'version="1.0.0"\n'
			+ 'xmlns="http://www.opengis.net/wfs"\n'
			+ 'xmlns:wfs="http://www.opengis.net/wfs"\n'
			+ 'xmlns:gml="http://www.opengis.net/gml"\n'
			+ 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
			+ 'xmlns:GTA23_project="http://www.gis.ethz.ch/GTA23_project" \n'
			+ 'xsi:schemaLocation="http://www.gis.ethz.ch/GTA23_project \n http://ikgeoserv.ethz.ch:8080/geoserver/GTA23_project/wfs?service=WFS&amp;version=1.0.0&amp;request=DescribeFeatureType&amp;typeName=GTA23_project%3Atrip\n'
			+ 'http://www.opengis.net/wfs\n'
			+ 'http://ikgeoserv.ethz.ch:8080/geoserver/schemas/wfs/1.0.0/WFS-basic.xsd">\n'
			+ '<wfs:Insert>\n'
			+ '<GTA23_project:trip>\n'
			+ '<trip_date_of_collection>' + date_of_collection + '</trip_date_of_collection>\n'
			+ '<trip_name>' + trip_name + '</trip_name>\n'
			+ '<trip_transport_mode>' + trip_transport_mode + '</trip_transport_mode>\n'
			+ '<trip_ip_address>' + ip_address + '</trip_ip_address>\n'
			+ '<geometry>\n'
			+ '<gml:LineString srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">\n'
			+ '<gml:coordinates xmlns:gml="http://www.opengis.net/gml" decimal="." cs="," ts=" ">' + lineStringCoords + '</gml:coordinates>\n'
			+ '</gml:LineString>\n'
			+ '</geometry>\n'
			+ '</GTA23_project:trip>\n'
			+ '</wfs:Insert>\n'
			+ '</wfs:Transaction>';

		$.ajax({
			type: "POST",
			url: gs.wfs,
			dataType: "xml",
			contentType: "text/xml",
			data: postData,
			success: function (xml) {
				// success feedback
				console.log(xml);
				console.log("Success from AJAX");

				// do something to notify user
				alert("Data uploaded");
			},
			error: function (xhr, ajaxOptions, thrownError) {
				// error handling
				console.log("Error from AJAX");
				console.log(xhr.status);
				console.log(thrownError);
			}
		});
	}

	/*
	function insertPoint_markedPoint(pt_lat, pt_lng, pt_time, trip_id) {

		let postData =
			'<wfs:Transaction\n'
			+ '  service="WFS"\n'
			+ '  version="1.0.0"\n'
			+ '  xmlns="http://www.opengis.net/wfs"\n'
			+ '  xmlns:wfs="http://www.opengis.net/wfs"\n'
			+ '  xmlns:gml="http://www.opengis.net/gml"\n'
			+ '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
			+ '  xmlns:GTA23_project="http://www.gis.ethz.ch/GTA23_project" \n'
			+ '  xsi:schemaLocation="http://www.gis.ethz.ch/GTA23_project \n http://ikgeoserv.ethz.ch:8080/geoserver/GTA23_project/wfs?service=WFS&amp;version=1.0.0&amp;request=DescribeFeatureType&amp;typeName=GTA23_project%3Amarked_point\n'
			+ '                      http://www.opengis.net/wfs\n'
			+ '                      http://ikgeoserv.ethz.ch:8080/geoserver/schemas/wfs/1.0.0/WFS-basic.xsd">\n'
			+ '  <wfs:Insert>\n'
			+ '    <GTA23_project:marked_point>\n'
			+ '      <marked_point_time>' + pt_time + '</marked_point_time>\n'
			+ '      <geometry>\n'
			+ '        <gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">\n'
			+ '          <gml:coordinates xmlns:gml="http://www.opengis.net/gml" decimal="." cs="," ts=" ">' + pt_lng + ',' + pt_lat + '</gml:coordinates>\n'
			+ '        </gml:Point>\n'
			+ '      </geometry>\n'
			+ '    </GTA23_project:marked_point>\n'
			+ '  </wfs:Insert>\n'
			+ '</wfs:Transaction>';

		$.ajax({
			type: "POST",
			url: gs.wfs,
			dataType: "xml",
			contentType: "text/xml",
			data: postData,
			success: function (xml) {
				//Success feedback
				console.log("Success from AJAX");
				// Do something to notify user
				alert("Data uploaded");
			},
			error: function (xhr, ajaxOptions, thrownError) {
				//Error handling
				console.log("Error from AJAX");
				console.log(xhr.status);
				console.log(thrownError);
			}
		});
	}

	function insertData_points(markedpoints, trip) {
		var trip_id = trip["trip_id"];
		for (let pt in markedpoints) {
			var pt_lat = pt[0];
			var pt_lng = pt[1];
			var pt_time = pt[2];
			insertPoint_markedPoint(pt_lat, pt_lng, pt_time, trip_id);
		}
	}
	*/

});
