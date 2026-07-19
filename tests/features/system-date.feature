Feature: System business date control

  Scenario: Get current business date
    When I request the current business date
    Then the response status should be 200
    And the response should contain a business_date field
