Feature: Maturity weekend handling

  Background:
    Given the current business date is known

  Scenario: Bond maturing on a weekend should defer principal payment to next business day
    Given a bond is created maturing on the next Saturday with total size 50000
    And the bond book window is open
    When "INV-012" subscribes for 25000 units
    And the book closes and allocation runs
    Then the bond should advance to maturity date
    And principal should not be paid while the maturity date is still a weekend day
