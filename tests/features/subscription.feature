Feature: Subscription rules

  Background:
    Given the current business date is known

  Scenario: Investor cannot subscribe twice to the same bond
    Given a bond is created with total size 50000 opening today and closing in 1 day
    And the bond book window is open
    When "INV-010" subscribes for 20000 units
    Then a second subscription attempt by "INV-010" for 5000 units should be rejected
