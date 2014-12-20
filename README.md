# nachoBackend
### So tasty...

#### Installation:
`bower install nachoBackend`

#### How to use:

- Include it in your test files AFTER angular-mocks. (so it can overwrite $httpBackend)
- inject in $httpBackend to your tests like normal.

##### Configure your standard backend only once!
  - Set up a "database" with various mocks of your backend responses.
  - Set standard routes ONCE that your app might hit (ie. 'GET /user/:id', or 'POST /pictures')
  - After that, just initialize httpBackend, and it will just work.


##### Configure your routes and resources;
  ```
  var patientResource = nachoBackend.resource({
    name: 'patient',
    route: 'api/provider/patients',
    instances: [Replicator.build('patient')]
  });

  // Easily add custom non-crud routes;
  // resource.route(route, response)
  patientResource.route('/verify', Replicator.build('patient', {verified: true}) );

  var practiceResource = nachoBackend.resource({
    name: 'practice',
    route: 'api/provider/patients',
    responses: {
      index: [200, Replicator.build('practice'), Replicator.build('practice', {withStripe: true})],
      get: [200, Repliactor.build('practice')],
      post: [201, {}],
      delete: [201, {}]
    }
  });

  var DB = $httpBackend.initialize(); --> sets up your configured backend.
  ```

### Then stop writing whenGET's all over the fucking place!

#### This lets you approach your test writing in a way more fun way.

Write tests like...

```

it('should show verify button for unverified patients', function() {
  visit('/patients');
  expect(find('verifyButton')).toBeVisible();
});

it('should not show verify button for verified patients', function() {
  DB.patient.first.is_verified = true;
  visit('/patients');
  expect(find('verifyButton')).not.toBeVisible();
});




```

