//BACKLOG:
/*

*COMPLETE: Display map with user coordinates
*COMPLETE: Set target using google map search
*COMPLETE: Check if user within radius from target and display reminder
*COMPLETE: Allow user to input reminder msg on when clicked on marker
*COMPLETE: Store multiple targets (more than one reminder)
*COMPLETE: Autocomplete search bar
*COMPLETE: local storage capabilities
*COMPLETE: Simplify html
*COMPLETE:Window on the side to list reminders

*Plus marker to add reminders
*local storage persistent
*reminder on device
*remove displayed reminders from the list
*me/clear buttons, me-infowindow
*info window - save button/part of reminder hides under the reminder_list 

*DB integration?

^--Release--^***********************************************************


*ability to edit reminders
*User specifies location by clicking on the map/curr location
*Display more than 1 search result
*perform check if went over limit of requests
*Cache things
*Show blue radius thingy:P when in range
*Allow user to customize range, etc

*Add invaluable tomcat notes to work notes

*/


// map-page functionality

//user's lat and lon
var lat = null;
var lon = null;

var geolocation_tries = 0; //used for getting GeoLocation with timeout

var map = null;  // google map object
var infowindow = null;
var searchMarker = null;

var addressField = null;
var autocomplete = null;

var reminderDict = {};
var markerDict = {};

var reminderList = null;

var meMarker = null;



/* Use HTML5 geolocation capability to provide location-based service */

function updateGeoLocation(func) {

    /*takes in the function to be executed, used to init map or update user position*/

    if (navigator.geolocation && geolocation_tries <= 2) {  // attempt to get user's geoLocation
                                                                                                  
        geolocation_tries +=1;

        navigator.geolocation.getCurrentPosition (function(position) {
                lat = position.coords.latitude;
                lon = position.coords.longitude;
            });
    }
    else {  // centre on UTSC if user has no geolocation or declines to reveal it 
   
        lat = 43.78646;
        lon = -79.1884399;
    }
    if (lat==null || lon==null) {  // wait until geoLocation determined                              
        setTimeout(function(){return updateGeoLocation(func)}, 500);
    }else{

	geolocation_tries = 0;
	// got geoLocation, now execute function
	func();
	
    }
};




// draw the map, and add overlay markers for user-selected information
function drawMap() {

    initializeGlobals();    
    plotMarkers();
    populateReminderList();

    // refresh vehicle markers every 30 seconds to show updated vehicle positions
    setInterval(function() { checkLocation(); }, 30000);

};


function initializeGlobals(){

    map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: new google.maps.LatLng(lat, lon),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });

    infowindow = new google.maps.InfoWindow();

    reminderDict = retrieveLocalStorageDict('reminders');
    
    reminderList = document.getElementById('reminder_list');

    searchMarker = new google.maps.Marker({
		    map: map,
		    position: new google.maps.LatLng(lat, lon)
	});

    searchMarker.setVisible(false); //hide initially


    addressField = document.getElementById('search_address');

    autocomplete = new google.maps.places.Autocomplete(addressField);
    
    autocomplete.bindTo('bounds', map);


    // GOOGLE SEARCH FIELD
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
		
	    infowindow.close();
	    searchMarker.setVisible(false);
	    var place = autocomplete.getPlace();
	    if (!place.geometry) {
		// Inform the user that the place was not found and return.
		alert('Not Found');
		return;
	    }

	    // If the place has a geometry, then present it on a map.
	    if (place.geometry.viewport) {
		map.fitBounds(place.geometry.viewport);
	    } else {
		map.setCenter(place.geometry.location); //.setCenter(new google.maps.LatLng(0,0))
		map.setZoom(17);  // Why 17? Because it looks good.
	    }
	    

	    //update search marker position
	    searchMarker.setIcon(/** @type {google.maps.Icon} */({
			url: place.icon, //TODO: plus icon
			    size: new google.maps.Size(71, 71),
			    origin: new google.maps.Point(0, 0),
			    anchor: new google.maps.Point(17, 34),
			    scaledSize: new google.maps.Size(35, 35)
			    }));
	    searchMarker.setTitle(addressField.value);
	    searchMarker.setPosition(place.geometry.location);
	    searchMarker.setVisible(true);


	    //marker onclick listener
	    google.maps.event.addListener(searchMarker, 'click', (function(searchMarker) {
			return function() {
			    
			   
			    var infoText = '<html>';
			    infoText += '<p id="reminder_status">Add a reminder:</p>';
			    infoText += '<input type="text" id="reminder_input" value=""/>';
			    infoText += '<button id="save_reminder">Save</button>';
			    infoText += '</html>';

			    // in the info window user types in the reminder msg and clicks save

			    infowindow.setContent(infoText);
			    infowindow.open(map, searchMarker);
			    
			    
			}
		    })(searchMarker));

	});
    

    


};

// center: the center goelocation of the radius
// radius: radius in meter
// loc: the geolocation that you want to check
function isInArea(targetlat, targetlon, radius, lat, lon) {
        var R = 6371;
        var lat1 = lat;
        var lon1 = lon;
        var lat2 = targetlat;
        var lon2 = targetlon;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return (d * 1000 <= radius)
};


function checkLocation(){
  
    //update user's current location
    updateGeoLocation(updateMeMarker);

    $.each(reminderDict, function(key,reminder) {
	    var targetlat = reminder['lat'];
	    var targetlon = reminder['lon'];
	    var active = reminder['active'];
	    
	    if (isInArea(targetlat,targetlon, 2000, lat, lon) && active ==1){
		alert(reminder['message']);
		reminder['active'] = 0;		
		localStorage['reminders'] = reminderDict;
	    }

        });

};

function populateReminderList(){

    $.each(reminderDict, function(key,reminder) {

	    var reminderIdplaceIdCOMBO = key;
	    addToReminderList(reminderIdplaceIdCOMBO);
	    
	});


};

function addToReminderList(reminderId){

    reminder = reminderDict[reminderId];

    var message = reminder['message'];
    var name = reminder['name'];
    var targetlat = reminder['lat'];
    var targetlon = reminder['lon'];
    var active = reminder['active'];


    if (active == 1){
	//add reminder to the list of reminders                                                                                                                                                      

	var listItem = '<li> <a href="#" class = "showReminder" '+
	    ' reminder_id="'+reminderId+'" >'  + message + '</a></li>';

	reminderList.innerHTML += listItem;

    };

};


function updateMeMarker(){

    meMarker.setPosition(new google.maps.LatLng(lat, lon));

};



function plotMarkers(){

    //plots all the markers for reminders if they are not yet created, also plots/updates meMarker

    if (meMarker == null){
	meMarker = new google.maps.Marker({
		position: new google.maps.LatLng(lat, lon),
		map: map,
		title: "me",
		icon: "img/me.gif"  // use a distinct icon for nearby stops
	    });
    }else{
	updateMeMarker();
    }
	

  //plot reminder markers
  $.each(reminderDict, function(key,reminder) {
	  var reminderIdplaceIdCOMBO = key;
	  var message = reminder['message'];
	  var name = reminder['name'];
	  var targetlat = reminder['lat'];
	  var targetlon = reminder['lon'];
	  var active = reminder['active'];
	  var marker = markerDict[reminderIdplaceIdCOMBO];
	  
	  if (active == 1){

	      if (marker==null){
		  marker = new google.maps.Marker({
			  position: new google.maps.LatLng(targetlat, targetlon),
			  map: map,
			  title: name,
			  icon: "img/blue.gif"  // use a distinct icon for nearby stops
		      });	  
		  
		  //save marker objects so can reference them later
		  markerDict[reminderIdplaceIdCOMBO] = marker;

		  //marker onclick listener - show reminder info                                                            
		  google.maps.event.addListener(marker, 'click', function(reminderIdplaceIdCOMBO) {
			  return function() {

			      showReminder(reminderIdplaceIdCOMBO);
			      
			  }
		      }(reminderIdplaceIdCOMBO));

	      }
	      

	  }
      });
  
}


//TODO: play with infowindow size - scroll bar..
function saveReminder(marker){
    /*
      schema (reminderID, message), (reminderID, placeID, active), (placeID,name,lat,lon)
    */

    var latlon = marker.getPosition();
    var newlat = latlon.lat();
    var newlon = latlon.lng();
    var name = marker.getTitle();
    console.log("marker.getTitle()"+marker.getTitle());

    var inputField = document.getElementById('reminder_input');
    var statusField = document.getElementById('reminder_status');
    

    var reminderMsg = inputField.value;
   
    //TODO: add reminder to DB
   
    var reminderId = Math.floor((Math.random()*100)+1);
    var placeId = Math.floor((Math.random()*100)+1);
    var key = reminderId +','+placeId;
    reminderDict[key] = {'message':reminderMsg, 'name':name,
			 'lat':newlat, 'lon':newlon, 'active':1};
    
    //update local storage
    localStorage['reminders'] = JSON.stringify(reminderDict); //convert to string
    
    navigator.notification.alert(window.localStorage.getItem('reminders'));


    console.log("target(lat,lon):"+JSON.stringify(reminderDict));
    console.log("me(lat,lon):"+lat+", "+lon);


    statusField.innerHTML = "Reminder has been saved!";

 
    //add reminder to the list of reminders
    addToReminderList(key);

    //update markers on the map
    plotMarkers();

}

function showReminder(reminder_id){
    var reminder = reminderDict[reminder_id];
    var message = reminder['message'];
    var name = reminder['name'];
    var targetlat = reminder['lat'];
    var targetlon = reminder['lon'];
    var active = reminder['active'];


    //use existing markers to show reminders
    var marker = markerDict[reminder_id];
    
    marker.setTitle(name);
    marker.setPosition(new google.maps.LatLng(targetlat,targetlon));
    marker.setVisible(true);

    map.setCenter(new google.maps.LatLng(targetlat,targetlon));
    //map.setZoom(17);
    
    infowindow.setContent(name + '<br/> TODO: '+ message);
    infowindow.open(map, marker);

}


function retrieveLocalStorageDict(key) {
    /*return the local storage dictionary stored under the specified key*/

    var dict = localStorage[key];
    if (dict == null) {
        dict = {}; /* always return a valid dictionary object */
    }
    else {   /* localStorage values are strings - parse to JSON object */
        dict = JSON.parse(dict);
    };
    return dict;
};


//use closure, because addDomListener expects a pointer to function
//and I would like to pass in a call to fn with arguments

function init(){
	document.addEventListener("deviceready", function(){ return updateGeoLocation(drawMap) }, true);
};


$(document).ready(init);

//google.maps.event.addDomListener(window, 'load', init);


$('#save_reminder').live("click", function(event) {
    saveReminder(searchMarker);
    });



$('a.showReminder').live("click", function(event) {
	var reminder_id =  $(this).attr('reminder_id');
	showReminder(reminder_id);
    });


//=========================vBSv=======================================















function createMarkers(places) {
    var bounds = new google.maps.LatLngBounds();

    for (var i = 0, place; place = places[i]; i++) {
	var image = {
	    url: place.icon,
	    size: new google.maps.Size(71, 71),
	    origin: new google.maps.Point(0, 0),
	    anchor: new google.maps.Point(17, 34),
	    scaledSize: new google.maps.Size(25, 25)
	};

	var marker = new google.maps.Marker({
		map: map,
		icon: image,
		title: place.name,
		position: place.geometry.location
	    });

	placesList.innerHTML += '<li>' + place.name + '</li>';

	bounds.extend(place.geometry.location);
    }
    map.fitBounds(bounds);
}

