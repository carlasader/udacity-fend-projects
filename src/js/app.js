// Core knockout-controlled functionality.

// TODO Consider using one info window instead of multiple.

(function(global) {
  var ko = global.ko,
      uuid = global.UUID,
      document = global.document,
      localStorage = global.localStorage,
      storageKeys = {
        MARKERS: 'markers'
      },
      defaults = {
        markers: [
          {
            id: 0,
            position: {lat: 35.67, lng: 139.6},
            title: 'Default Marker 1'
          },
          {
            id: 1,
            position: {lat: 35.67, lng: 139.7},
            title: 'Default Marker 2'
          },
          {
            name: 'Default Folder 1',
            contents: [
              {
                id: 2,
                position: {lat: 35.66, lng: 139.7},
                title: 'Default Marker 1.1'
              },
              {
                name: 'Default Folder 1.1',
                contents: [
                  {
                    id: 3,
                    position: {lat: 35.65, lng: 139.7},
                    title: 'Default Marker 1.1.1'
                  },
                  {
                    id: 4,
                    position: {lat: 35.64, lng: 139.7},
                    title: 'Default Marker 1.1.2'
                  }
                ]
              }
            ]
          },
          {
            id: 5,
            position: {lat: 35.67, lng: 139.8},
            title: 'Default Marker 3'
          }
        ]
      },
      map = global.map,
      appViewModel = new AppViewModel();

  // Marker Model
  function Marker(data) {
    // TODO Additional (google.maps) properties to consider:
    //  data.draggable - Makes the marker draggable.
    //  data.icon - Icon for the marker.
    //  data.label - First letter of this string is displayed on marker.
    //  data.visible - Useful for hiding markers.
    //  data.zIndex - Useful for sorting markers by folder depth.

    this.id = ko.observable(data.id);
    this.position = ko.observable(data.position);
    this.title = ko.observable(data.title);
  }

  // Folder Model
  function Folder(data) {
    // The name of the folder.
    this.name = ko.observable(data.name);
    // The folder contents (marker and/or marker folder array).
    this.contents = ko.observableArray(data.contents);
  }

  // App View Model
  function AppViewModel() {
    var self = this;

    // A collection of map markers and folders.
    self.markers = ko.observableArray([]);

    // Sidebar functionality.
    // TODO:
    //  - Provide a method for toggling a marker folder between collapsed and expanded.
    //  - Provide a method for centering on a marker or set of markers.
    //  - Provide methods for filtering markers by title and visibility.
    self.sidebar = {
      expanded: ko.observable(false),

      toggle: function() {
        console.log('sidebar toggle');
        self.sidebar.expanded(!self.sidebar.expanded());
      },

      addFolder: function(folder) {
        // Add a folder.
      },

      modifyFolder: function(folder) {
        // Modify a folder.

      },

      removeFolder: function(folder) {
        // Remove a folder.

      }
    };

    // Markers form functionality.
    self.markersForm = {
      pending: ko.observableArray([]),

      visible: ko.observable(false),

      open: function() {
        if (!self.markersForm.visible()) {
          self.markersForm.visible(true);
        }
      },

      close: function() {
        if (self.markersForm.visible()) {
          self.markersForm.visible(false);
        }
      },

      submit: function() {
        // Close the markers form.
        self.markersForm.close();

        // Filter the confirmed markers out of the pending array and into the markers
        // array.
        self.markersForm.pending(self.markersForm.pending().filter(function(pending) {
          if (pending.confirmed()) {
            // Move to the markers array.
            self.markers.push(pending.marker);
            // TODO Save. Subscribe a save method to self.markers?
            return false;
          } else {
            return true;
          }
        }));

        // Clear the pending markers array.
        self.markersForm.clearPending();
      },

      cancel: function() {
        // Close the markers form.
        self.markersForm.close();

        // Clear the pending markers array.
        self.markersForm.clearPending();
      },

      clearPending: function() {
        self.markersForm.pending().forEach(function(pending) {
          removeMarker(pending.marker);
        });

        self.markersForm.pending([]);
      }
    };

    // Initialize the App View Model.
    init();

    // Private methods.

    /**
     * Initializes self.markers with markers and marker folders from local storage,
     * or from defaults if local storage is empty; adds initial markers to the map;
     * Adds an event listener to the map search box.
     */
    function init() {
      var arr = JSON.parse(localStorage.getItem(storageKeys.MARKERS)) || defaults.markers;

      arr.forEach(function(data) {
        if (data.contents) {
          var folder = createFolder(data);
          self.markers.push(folder);
        } else {
          var marker = createMarker(data);
          self.markers.push(marker);
        }
      });

      // Call selectPlaces when the user selects a search result.
      map.onPlacesChanged(selectPlaces);

      // Call confirmCustomMarker when the user double clicks on the map.
      map.onMapDblClick(confirmCustomMarker);
    }

    /**
     * Creates and returns a marker.
     */
    function createMarker(data) {
      var marker = new Marker(data);

      map.addMarker(data);

      var infoWindow = map.createInfoWindow();

      map.onMarkerClick(data.id, function() {
        var content = createInfoWindowContent(marker);

        map.setInfoWindowContent(infoWindow, content);
        map.openInfoWindow(infoWindow, data.id);

        ko.applyBindings(appViewModel, document.getElementById('marker-' + data.id));
      });

      return marker;
    }

    /**
     * Creates and returns a folder.
     */
    function createFolder(data) {
      data.contents = createFolderContents(data.contents);
      var folder = new Folder(data);

      return folder;
    }

    /**
     * Creates and returns an array of markers and/or folders.
     */
    function createFolderContents(contents) {
      var results = [];

      contents.forEach(function(data) {
        if (data.contents) {
          results.push(createFolder(data));
        } else {
          results.push(createMarker(data));
        }
      });

      return results;
    }

    /**
     * Returns an HTML string intended for use as an info window's content.
     * It is identified by an id equal to the related marker's id prefixed with
     * 'marker-', and utilizes the custom component 'info-window'.
     */
    function createInfoWindowContent(marker) {
      return '<div id="marker-' + marker.id() + '" data-bind="component: { name: \'info-window\', params: { id: \'' + marker.id() + '\' } }"></div>';
    }

    /**
     * Destroys a created marker (the opposite of `createMarker(data)`).
     */
    function removeMarker(marker) {
      map.removeMarker(marker.id());
    }

    /**
     * Saves self.markers to local storage as a JSON string.
     */
    function saveMarkers() {
      localStorage.setItem(storageKeys.MARKERS, ko.toJSON(self.markers));
    }

    /**
     * Called when the user selects a place or set of places in the map search box.
     * Opens the markers form populated with the place(s) selected.
     */
    function selectPlaces() {
      var places = this.getPlaces();

      // Create a marker for each place and push it to the pending markers array
      // along with the default confirmed value.
      places.forEach(function(place) {
        // TODO Icon, etc.
        var marker = createMarker({
          id: uuid.generate(),
          title: place.name,
          position: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        });

        self.markersForm.pending.push({
          marker: marker,
          confirmed: ko.observable(true)
        });
      });

      // Open the confirm markers form.
      self.markersForm.open();
    }

    /**
     * Called when the user double clicks on the map. Opens the markers form populated
     * with a marker created using the location clicked.
     */
    function confirmCustomMarker(e) {
      // Create a marker for the location clicked.
      var marker = createMarker({
        id: uuid.generate(),
        title: 'Custom Marker',
        position: {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        }
      });

      // Push the created marker to the pending markers array.
      self.markersForm.pending.push({
        marker: marker,
        confirmed: ko.observable(true)
      });

      // Open the confirm markers form.
      self.markersForm.open();
    }
  }

  // Custom Component
  ko.components.register('info-window', {
    viewModel: function(params) {
      this.info = '<p>[' + getMarker(params.id).title().toUpperCase() + ' INFORMATION]</p>';
      this.test = appViewModel.sidebar.toggle;

      /**
       * Gets the marker with the given id from the appViewModel.markers array.
       */
      function getMarker(id) {
        return search(appViewModel.markers());

        function search(arr) {
          var deeper = [];

          for (var i = 0; i < arr.length; i++) {
            if (arr[i].contents) {
              // Folder
              var contents = arr[i].contents();

              for (var j = 0; j < contents.length; j++) {
                deeper.push(contents[j]);
              }
            } else if (arr[i].id().toString() === id) {
              return arr[i];
            }
          }

          // Need to search deeper.
          if (deeper.length) {
            return search(deeper);
          } else {
            return null;
          }
        }
      }
    },

    template: '<div data-bind="html: info"></div><button data-bind="click: test">Test</button>'
  });

  ko.applyBindings(appViewModel);
})(this);
