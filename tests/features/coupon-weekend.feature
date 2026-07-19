Feature: Coupon weekend handling

  Background:
    Given the current business date is known

  Scenario: No coupon is paid when business date advances onto a weekend
    Given a bond is created with total size 50000 opening today and closing in 1 day
    And the bond book window is open
    When "INV-011" subscribes for 20000 units
    And the book closes and allocation runs
    Then no coupon amount should be added when the business date is a weekend day
