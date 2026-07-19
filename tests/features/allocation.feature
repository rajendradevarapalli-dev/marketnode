Feature: Bond allocation

  Background:
    Given the current business date is known

  Scenario: Full allocation when subscriptions do not exceed total size
    Given a bond is created with total size 50000 opening today and closing in 1 day
    And the bond book window is open
    When "INV-004" subscribes for 20000 units
    And the book closes and allocation runs
    Then "INV-004" should be allocated exactly 20000 units
    And the subscription status should be "ALLOCATED"

  Scenario: Proportional allocation does not exceed total size when oversubscribed
    Given a bond is created with total size 100000 opening today and closing in 1 day
    And the bond book window is open
    When "INV-001" subscribes for 40000 units
    And "INV-002" subscribes for 30000 units
    And "INV-003" subscribes for 50000 units
    And the book closes and allocation runs
    Then the sum of all allocated quantities should not exceed 100000
