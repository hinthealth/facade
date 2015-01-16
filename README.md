# Facade

#### Installation:
`bower install facade`


#### The problem:
  If you write a lot of angular tests, you probably have lots of similar whenGET's and whenPOST's, etc. sitting all over the place in your code. It's annoying, gross, and it discourages people from writing tests when there's a lot of boiler plate. Not to mention it makes it way harder to quickly understand the meaning of the tests, and honestly, you usually just don't care about that route, and you just want it to work. 

#### The solution:

  Put it in one place! Put up a Facade!

  Your tests will go from...

  ```
    // In testFile1.js
    $httpBackend.whenGET('/api/provider/patients').respond([]);
    $httpBackend.whenGET('/api/provider/coupons?archived=false').respond([coupon]);
    $httpBackend.whenGET('/api/provider/plan').respond(plan);
    $httpBackend.whenGET('/api/provider/practitioners').respond([]);

    it("should show a coupon", function() {
      // do test things.
    })

    // And then in testFile2.js
    $httpBackend.whenGET('/api/provider/patients').respond([]);
    $httpBackend.whenGET('/api/provider/coupons?archived=false').respond([coupon]);
    $httpBackend.whenGET('/api/provider/plan').respond(plan);
    $httpBackend.whenGET('/api/provider/practitioners').respond([]);

    it("should show a plan", function() {
      // do test things.
    });

  ```

  to simply...
  ```
    // In testFile1.js
    it("should show a coupon", function() {
      // do test things
    });

    // And then in testFile2.js
    it("should show a plan", function() {
      // do test things
    });

  ```

#### How to use:

##### 1.) Include it in your karma conf file like so...
  ```
    files: [
      'bower_components/facade/dist/facade.min.js'
    ]
  ```

##### 2.) Configure your standard backend only once!
  - Set up the resources your app uses ('users', 'photos', 'patients', whatever)
  - Set up a "database" with various mocks of your backend responses for those resources.

##### 3.) Initialize Facade in your tests.
```
  // Somewhere in your test file, do something like...

  beforeEach(function() {
    Facade.initialize();
  })

  afterEach(function() {
    // To keep tests running independently.
    Facade.reset(); 
    // OR... Facade.clear() depending on your workflow. See below for more info.
  });
```


#### Basics:
  
  **Adding your resources**
  (perhaps in a seperate mock file that you include with each test);

  ```
  var patientResource = Facade.resource({
    name: 'patient',
    url: 'api/provider/patients'
  });
  ```
  By creating the resource, Facade will automatically make all standard REST routes (index, create, and then get/:id, put/:id, and delete/:id).

  **Adding your responses**

  ```
    patientResource.addItem({id: 'pat-2J8K', name: "New Patient"});
  ```
  When adding items, Facade automatically creates routes based on that items id.

  For example, this item creates a route for '/api/provider/patients/pat-2J8K';

  And when you hit that route, the response will be `{id: 'pat-2J8K', name: "New Patient"}`.

  **Using the 'database'**
  After adding items, those items go into Facade's 'database'. You can access it like so.
  ```
  var DB = Facade.db;
  var patient = DB.patient.find('pat-2J8K');
  // Note it's DB.patient because we set the name as "patient" when creating the resource.
  ```

  **Keeping tests Independent**
  Depending on your workflow, there are two ways to keep each test run independent.

  ```
  Facade.clear();
  // clear will actually just set the db/routes/resources to empty objects. Note, it also clears out the `.backend` definition. So you should also be setting $httpBackend in a beforeEach.
  // Use this when you actually add resources/objects in the beforeEach of your tests, and thus they are run every time.
  ```

  Or...
  ```
  Facade.reset();
  // reset brings things back to the way they were at initialization.
  // Use this if you set up all your resources/routes in some mocks file that only gets included (and thus run) once, and isn't run each time in your tests.
  ```


#### More power!


  **Nesting routes**

  You can take that resource you just made, and then nest another one under it, like so:
  ``` 
  var patientChargesResource = patientResource.resource({
    name: 'charge',
    url: '/charges'
  });

  patientChargesResource.url // '/api/provider/patients/charges'
  ```

  **Adding custom routes**
  If you need more than rest routes, it's easy to add whatever you like

  ```
    patientResource.addRoute({
      method:"POST",
      route:"/verify",
      // This callback is called everytime the route is run. It is not the response.
      // Currently the response for custom routes is just the item, or collection, depending on // the route.
      callback: function(data, item ) {
        item.verified = true;
        // If the onItem flag was false, this function would be passed the collection,
        // and not the item.
      },
      // this flag adds the route for every item in the db. eg. '/patients/1/verify'
      onItem: true 
    });
  ```
  **notes about the addRoute options hash**
  `onItem`: If this flag is omitted, or set to false, it will create the route on the collection.
  eg. '/patients/verify';

  `callback`: This is meant to let you "perform the action" of the route. Very similar to whatever your real backend might do for this route. The callback is passed the request data, and then the appropriate database object. Which is the item if it's an item route (eg. patients/3/verify), or the collection if it's a colleciton route (eg. patients/verify)


  **Creating special responses (and errors)**
  Facade lets you alter the response of any route as needed. Typical use of this would be for simulating errors.

  Just find the route, and then do what you will!
  ```
    var indexRoute = Facade.findRoute("GET", patientResource.url)

    indexRoute.nextResponse(404, {message: "Not found"});
  ```
  As you might expect the next time the route gets hit, it will return a 404 status with
  a JSON payload of {message: "Not found"}.

  The *next* time that route is hit (after the error has been returned once), it will
  return it's original response;

  Also, a note, you could do as many "nextResponses" on the indexRoute as you like. They get thrown into an array, and then shifted off one at a time as the route gets hit.

  **Getting the route from an item**
  For a little convenience, you can pull an item from the DB that knows about it's URL.
  Specifically by doing...
  ```
  var patient = DB.patient.find('pat-JF8K', {wrap: true});
  patient.showUrl(); // '/api/provider/patients/pat-JF8K';
  ```
