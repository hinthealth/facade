(function() {
  'use strict'
  window.NachoBackend = {};

  NachoBackend.resources = {};
  NachoBackend.db = {};

  // PUBLIC FUNCTIONS //
  NachoBackend.resource = function(opts) {
    opts = opts || {};
    checkForResourceErrors(opts);

    var resource = buildResource(opts);
    var table = buildTable(opts.name);

    // Add resource to master list
    this.resources[opts.name] = resource;

    // Create 'table' in the 'database'
    this.db[opts.name] = table;

    return resource;
  };

  NachoBackend.initialize = function(opts) {
    checkForHttpBackend(opts);
    _.each(this.resources, function(resource) {
      createRestRoutes(resource);
    });
  };


  // PRIVATE FUNCTIONS //


  // ** Routes ** //

  function createRestRoutes(resource) {
    createIndexRoute(resource);
    createSingleItemRoutes(resource);
  }

  function createIndexRoute(resource) {
    var headers = {};
    NachoBackend.backend.whenGET(resource.url)
      .respond(function(method, url, data, headers) {
        //     [status, data,                       headers, status text ]
        return [200,    getAllItems(resource), {},     'OK']
      });
  }

  function createItemIdRoute(resource, id) {
    var headers = {};
    NachoBackend.backend.whenGET(resource.url + '/' + id)
      .respond(function(method, url, data, headers) {
        //     [status, data,                       headers, status text ]
        return [200,    getOneItem(resource, id),   {},     'OK']
      });
  }

  function createPatchRoute(resource, id) {
    var headers = {};
    NachoBackend.backend.whenPUT(resource.url + '/' + id)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var item = getOneItem(resource, id);
        // Perform the patch on the db object
        _.assign(item, JSON.parse(data));

        //     [status, data,                       headers, status text ]
        return [200,    item,   {},     'OK']
      });
  }

  function createPostRoute(resource) {
    var headers = {};
    NachoBackend.backend.whenPOST(resource.url)
      .respond(function(method, url, data, headers) {
        data = data || {};

        // Perform the POST on the db
        var item = resource.add(JSON.parse(data));

        //     [status, data,                       headers, status text ]
        return [200,    item,   {},     'OK']
      });
  }

  function createDeleteRoute(resource, id) {
    var headers = {};
    NachoBackend.backend.whenDELETE(resource.url + '/' + id)
      .respond(function(method, url, data, headers) {
        data = data || {};

        // Perform the delete on the db
        var item = getTable(resource).delete(id)

        //     [status, data,                       headers, status text ]
        return [200,    item,   {},     'OK']
      });
  }

  function createSingleItemRoutes(resource) {
    var routeFunctions = [
      createItemIdRoute,
      createPatchRoute,
      createPostRoute,
      createDeleteRoute
    ];
    var allItems = getAllItems(resource);
    _.each(routeFunctions, function(routeFunction) {
      _.each(allItems, function(item) {
        routeFunction(resource, item.id);
      })
    });
  }

  // ** Db Helpers ** //

  function getTable(resource) {
    checkForTableExistence(resource.name);
    return NachoBackend.db[resource.name];
  }

  function getAllItems(resource) {
    return getTable(resource).getAll();
  }

  function getOneItem(resource, id) {
    return getTable(resource).find(id);
  }


  // ** Class Factories ** //

  function buildResource(opts) {
    return {
      url: opts.url,
      name: opts.name,
      add: function(resourceInstance) {
        checkForResourceId(resourceInstance);
        getTable(this).create(resourceInstance);
        return resourceInstance;
      }
    };
  }

  function buildTable(name) {
    var storage = {};
    return {
      getAll: function() {
        return _.map(storage);
      },
      create: function(resourceInstance) {
        checkForResourceId(resourceInstance);
        var id = resourceInstance.id;
        storage[JSON.stringify(id)] = resourceInstance;
      },
      find: function(id) {
        checkForIdToFindOn(id);
        var item = storage[JSON.stringify(id)];
        if (!item) {
          throw new Error("No item found in " + name + " table with id of " + id)
        }
        return item;
      },
      delete: function(id) {
        checkForIdToFindOn(id);
        var id = JSON.stringify(id);
        var item = storage[id];
        if (!item) {
          throw new Error("No item found in " + name + " table with id of " + id + ". So can't delete it.");
        }
        storage[id] = null;
        return item;
      }
    }
  }


  // ** Error Handling ** //

  function checkForResourceErrors(opts) {
    if (!_.isString(opts.name) ) {
      throw new Error("You must provide a name for the resource");
    }
    if (NachoBackend.resources[opts.name]) {
      throw new Error(
        "A resource named " + opts.name + " already exists. Please choose a different name."
      );
    }
    if (!_.isString(opts.url) ) {
      throw new Error("You must provide a url for the " + opts.name + " resource");
    }
    var urls = _.pluck(NachoBackend.resources, 'url');
    if ( _.find(urls, function(url) { return url === opts.url; }) ) {
      throw new Error("The url " + opts.url + " is already taken. Please change one");
    }
  };

  function checkForResourceId(resourceInstance) {
    if (!resourceInstance.id) {
      throw new Error("The resource must have an id property.");
    }
  }

  function checkForIdToFindOn(id) {
    if (!id) {
      throw new Error("You must pass in an id to find a record");
    }
  }

  function checkForHttpBackend(opts) {
    opts = opts || {};
    NachoBackend.backend = NachoBackend.backend || opts.backend || {};
    if (!_.isFunction(NachoBackend.backend.whenGET)) {
      throw new Error(
        "$httpBackend not detected. Either add it as an option when initializing, or set the" +
        " attribute directly on NachoBackend via NachoBackend.backend = $httpBackend"
      );
    }
  }

  function checkForTableExistence(name) {
    var table = NachoBackend.db[name];
    if (!table) {
      throw new Error("There doesnt appear to be a table called " + name);
    }
  }

}).call(this);
