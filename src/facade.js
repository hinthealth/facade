(function() {
  'use strict'
  window.Facade = {};

  var backendIsInitialized = false;

  Facade.resources = {};
  Facade.db = {};
  var facadeRoutes = {};

  var originalResources = {}
  var originalDb = {}
  var originalRoutes = {};

  // PUBLIC FUNCTIONS //
  Facade.resource = function(opts) {
    opts = opts || {};
    checkForResourceErrors(opts);

    // Create 'table' in the 'database'
    this.db[opts.name] = buildTable(opts.name);

    // Create a slot for the resources routes in the master route list;
    facadeRoutes[opts.name] = [];

    // Add resource to master list
    return this.resources[opts.name] = buildResource(opts);
  };

  Facade.initialize = function(opts) {
    checkForHttpBackend(opts);
    backendIsInitialized = true;
    _.each(this.resources, function(resource) {
      createRestRoutes(resource);
    });
    createCopiesOfMasterLists();
  };

  Facade.reset = function() {
    Facade.resources = _.clone(originalResources, true);
    Facade.db = _.clone(originalDb, true);
    facadeRoutes = _.clone(originalRoutes, true);
    backendIsInitialized = false;
  };

  function createCopiesOfMasterLists() {
    originalResources = _.clone(Facade.resources, true);
    originalDb = _.clone(Facade.db, true);
    originalRoutes = _.clone(facadeRoutes, true);
  }

  Facade.clear = function() {
    this.resources = {};
    this.db = {};
    facadeRoutes = {};
    this.backend = undefined;
    backendIsInitialized = false;
  };

  Facade.findRoute = function(method, url) {
    var routeObj;
    var fullRoute = [method, url].join(' ');
    var exists = _.any(facadeRoutes, function(resourceRoutes) {
      return Boolean(resourceRoutes[fullRoute]) && (routeObj = resourceRoutes[fullRoute]);
    });
    if (!exists) {
      throw new Error("The route " + fullRoute + " does not exist");
    }

    return routeObj;
  }


  // PRIVATE FUNCTIONS //


  // ** Routes ** //

  function createRestRoutes(resource) {
    createCollectionRoutesFor(resource);
    createAllItemRoutes(resource);
  }


  function createCollectionRoutesFor(resource) {
    _.each(collectionRouteCreators(), function(routeCreator) {
      var opts = {resource: resource, method: routeCreator.method}
      routeCreator.createWith(opts);
      storeRoute(opts);
    })
  }

  function createAllItemRoutes(resource) {
    var allItems = getAllItems(resource);
    _.each(allItems, function(item) {
      createItemRoutesFor(resource, item);
    });
  }

  function createItemRoutesFor(resource, item) {
    _.each(itemRouteCreators(), function(routeCreator) {
      var opts = {resource: resource, item: item, method: routeCreator.method}
      routeCreator.createWith(opts);
      storeRoute(opts);
    });
  }

  function createItemIdRoute(opts) {
    var headers = {};
    Facade.backend.whenGET(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        var route = Facade.findRoute(method, url);
        var response = route.getSpecialResponseOr(function() {
          var item = getOneItem(opts.resource, opts.item.id);
          return [200, JSON.stringify(item), {}, 'OK'];
        })
        // TODO: Add check that the response is an array with 4 items;
        return response;
      });
  }


  function createPutRoute(opts) {
    var headers = {};
    Facade.backend.whenPUT(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var route = Facade.findRoute(method, url);
        var response = route.getSpecialResponseOr(function() {
          var item = getOneItem(opts.resource, opts.item.id);
          // Perform the patch on the db object
          _.assign(item, JSON.parse(data));
          return [200, JSON.stringify(item), headers, 'OK']
        })

        return response;
      });
  }


  function createDeleteRoute(opts) {
    var headers = {};
    Facade.backend.whenDELETE(opts.resource.url + '/' + opts.item.id)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var route = Facade.findRoute(method, url);

        // Perform the delete on the db
        var response = route.getSpecialResponseOr(function() {
          var item = getTable(opts.resource).delete(opts.item.id);
          return [200, JSON.stringify(item), {}, 'OK'];
        })

        return response;
      });
  }

  function createCreateRoute(opts) {
    var headers = {};
    Facade.backend.whenPOST(opts.resource.url)
      .respond(function(method, url, data, headers) {
        data = data || {};
        var route = Facade.findRoute(method, url);

        // Perform the POST on the db
        var response = route.getSpecialResponseOr(function() {
          var item = opts.resource.addItem(JSON.parse(data));
          return [200, JSON.stringify(item), {}, 'OK'];
        })

        return response;
      });
  }

  function createIndexRoute(opts) {
    var headers = {};
    Facade.backend.whenGET(opts.resource.url)
      .respond(function(method, url, data, headers) {
        var route = Facade.findRoute(method, url);

        var response = route.getSpecialResponseOr(function() {
          return [200,    getAllItems(opts.resource), {},     'OK']
        })

        return response;
      });
  }


  function itemRouteCreators() {
    return  [
      {createWith: createItemIdRoute, method: 'GET'},
      {createWith: createPutRoute, method: 'PUT'},
      {createWith: createDeleteRoute, method: 'DELETE'}
    ];
  }

  function collectionRouteCreators() {
    return  [
      {createWith: createCreateRoute, method: 'POST'},
      {createWith: createIndexRoute, method: 'GET'}
    ];
  }


  function createCustomRouteForItem(opts) {
    var fullUrl = opts.resource.url + '/' + opts.item.id + opts.route;
    Facade.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};
      var route = Facade.findRoute(method, url);

      if (!route.hasSpecialResponse()) {
        _.isFunction(opts.callback) && opts.callback(requestData, opts.item);
      }

      var response = route.getSpecialResponseOr(function() {
        return [200, JSON.stringify(opts.item), {}, 'OK'];
      });

      return response;
    });
  }

  function createCustomRouteForCollection(opts) {
    var fullUrl = opts.resource.url + opts.route;
    Facade.backend.when(opts.method, fullUrl).respond(function(method, url, requestData, headers) {
      requestData = requestData || {};
      var collection = getTable(opts.resource).getAll();
      var route = Facade.findRoute(method, url);

      if (!route.hasSpecialResponse()) {
        _.isFunction(opts.callback) && opts.callback(requestData, collection);
      }

      var response = route.getSpecialResponseOr(function() {
        return [200, JSON.stringify(collection), {}, 'OK'];
      });

      return response;
    });
  }

  function storeRoute(opts) {
    opts.route = opts.route || '';
    var prefix = opts.resource.url;
    var fullUrl = opts.item ? prefix + '/' + opts.item.id + opts.route : prefix + opts.route;
    var fullRoute = [opts.method, fullUrl].join(' ')
    facadeRoutes[opts.resource.name][fullRoute] = buildRoute(fullRoute);
  }


  // ** Class Factories ** //

  function buildResource(opts) {
    // For nesting child urls if called from a parent.
    opts = opts || {};
    opts.url = (this && this.url) ? this.url + opts.url : opts.url;
    return {
      url: opts.url,
      name: opts.name,
      addItem: function(item) {
        checkForResourceId(item);
        getTable(this).create(item);
        if (backendIsInitialized) {
          createItemRoutesFor(this, item);
        }
        return item;
      },
      resource: buildResource,
      addRoute: function(opts) {
        opts = opts || {};
        checkForRequiredRouteArgs(opts);
        opts.resource = this;
        if (opts.onItem) {
          var allItems = getTable(this).getAll()
          _.each(allItems, function(item) {
            opts.item = item;
            createCustomRouteForItem(opts);
            storeRoute(opts);
          });
        }else {
          createCustomRouteForCollection(opts);
          storeRoute(opts);
        }
      }
    };
  }

  function buildRoute(fullRoute) {
    var specialResponses = [];
    return {
      fullRoute: fullRoute,
      nextResponse: function(status, data) {
        specialResponses.push({status: status, data: data});
      },
      getSpecialResponse: function() {
        return specialResponses.shift();
      },
      hasSpecialResponse: function() {
        return Boolean(specialResponses.length);
      },
      getSpecialResponseOr: function(callback) {
        if (this.hasSpecialResponse()) {
          var response = this.getSpecialResponse();
          return [response.status, JSON.stringify(response.data), {}, 'OK'];
        }else {
          return _.isFunction(callback) && callback()
        }
      }
    }
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
      find: function(id, opts) {
        checkForIdToFindOn(id);
        opts = opts || {};
        var item = storage[JSON.stringify(id)];
        if (!item) {
          throw new Error("No item found in " + name + " table with id of " + id)
        }
        return opts.wrap ? itemWrapper(item, getResource(name)) : item;
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


  // ** Db Helpers ** //

  function getTable(resource) {
    var table = Facade.db[resource.name];
    if (!table) {
      throw new Error("There doesnt appear to be a table called " + resource.name);
    }
    return table;
  }

  function getAllItems(resource) {
    return getTable(resource).getAll();
  }

  function getOneItem(resource, id, opts) {
    opts = opts || {};
    return getTable(resource).find(id, opts);
  }

  function itemWrapper(item, resource) {
    item = _.extend({}, item);
    item.showUrl = function() {
      return resource.url + '/' + item.id;
    }
    return item;
  }

  // ** Resource Helpers ** //

  function getResource(name) {
    var resource = Facade.resources[name];
    if (!resource) {
      throw new Error("There doesnt appear to be a resource called " + name);
    }
    return resource;
  }



  // ** Error Handling ** //

  function checkForResourceErrors(opts) {
    if (!_.isString(opts.name) ) {
      throw new Error("You must provide a name for the resource");
    }
    if (Facade.resources[opts.name]) {
      throw new Error(
        "A resource named " + opts.name + " already exists. Please choose a different name."
      );
    }
    if (!_.isString(opts.url) ) {
      throw new Error("You must provide a url for the " + opts.name + " resource");
    }
    var urls = _.pluck(Facade.resources, 'url');
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
    Facade.backend = Facade.backend || opts.backend || {};
    if (!_.isFunction(Facade.backend.whenGET)) {
      throw new Error(
        "$httpBackend not detected. Either add it as an option when initializing, or set the" +
        " attribute directly on Facade via Facade.backend = $httpBackend"
      );
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

  function checkForUrlExistence(method, url) {
    var inquiredRoute = [method, url].join(' ');
  }

}).call(this);
