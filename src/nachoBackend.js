(function() {
  'use strict'
  window.NachoBackend = {};

  NachoBackend.resources = {};
  NachoBackend.db = {};
  var backendIsInitialized = false;

  // PUBLIC FUNCTIONS //
  NachoBackend.resource = function(opts) {
    opts = opts || {};
    checkForResourceErrors(opts);

    // Create 'table' in the 'database'
    this.db[opts.name] = buildTable(opts.name);

    // Add resource to master list
    return this.resources[opts.name] = buildResource(opts);
  };

  NachoBackend.initialize = function(opts) {
    checkForHttpBackend(opts);
    backendIsInitialized = true;
    _.each(this.resources, function(resource) {
      createRestRoutes(resource);
    });
  };

  NachoBackend.clear = function() {
    this.resources = {};
    this.db = {};
    this.backend = undefined;
    backendIsInitialized = false;
  }


  // PRIVATE FUNCTIONS //


  // ** Routes ** //

  function createRestRoutes(resource) {
    createCollectionRoute(resource);
    createAllItemRoutes(resource);
  }

  function createCollectionRoute(resource) {
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

  function routeCreators() {
    return  [
      createItemIdRoute,
      createPatchRoute,
      createPostRoute,
      createDeleteRoute
    ];
  }

  function createAllItemRoutes(resource) {
    var allItems = getAllItems(resource);
    _.each(allItems, function(item) {
      createItemRoutesFor(resource, item);
    });
  }

  function createItemRoutesFor(resource, item) {
    _.each(routeCreators(), function(routeCreator) {
      routeCreator(resource, item.id);
    });
  }

  function createCustomRouteForItem(opts) {
    var fullUrl = opts.resource.url + '/' + opts.item.id + opts.route;
    NachoBackend.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};

      _.isFunction(opts.callback) && opts.callback(requestData, opts.item);
      //     [status, data,   headers, status text ]
      return [200,    opts.item,   {},     'OK']
    });
  }

  function createCustomRouteForCollection(opts) {
    var fullUrl = opts.resource.url + opts.route;
    NachoBackend.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};
      var collection = getTable(opts.resource).getAll();

      _.isFunction(opts.callback) && opts.callback(requestData, collection);
      //     [status, data,   headers, status text ]
      return [200,    collection,   {},     'OK']
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
    // For nesting child urls if called from a parent.
    opts = opts || {};
    opts.url = (this && this.url) ? this.url + opts.url : opts.url;
    return {
      url: opts.url,
      name: opts.name,
      add: function(item) {
        checkForResourceId(item);
        getTable(this).create(item);
        if (backendIsInitialized) {
          createItemRoutesFor(this, item);
        }
        return item;
      },
      resource: buildResource,
      route: function(opts) {
        // Check for method and route and callback
        opts = opts || {};
        checkForRequiredRouteArgs(opts);
        opts.resource = this;
        if (opts.onItem) {
          var allItems = getTable(this).getAll()
          _.each(allItems, function(item) {
            opts.item = item;
            createCustomRouteForItem(opts);
          });
        }else {
          createCustomRouteForCollection(opts);
        }
      }
    };
  }

  function buildTable(name) {
    var storage = {};
    return {
      getAll: function() {
        return _.map(storage);
      },
      create: function(item) {
        checkForResourceId(item);
        var id = item.id;
        storage[JSON.stringify(id)] = item;
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

  function checkForRequiredRouteArgs(opts) {
    var httpVerbs = ['GET', 'POST', 'PATCH', 'PUT', 'HEAD', 'DELETE'];
    if (!_.contains(httpVerbs, opts.method)) {
      throw new Error(opts.method + " is not a valid HTTP method.")
    }
    if (!_.isString(opts.route)) {
      throw new Error("You must supply a route. eg: '/my_route' ");
    }
  }

}).call(this);
