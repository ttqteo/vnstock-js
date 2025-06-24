# Changelog

## vnstock-js 0.5.0 release
* Add fetching realtime from SSI (testing), naming VnstockRealtime
* Eliminate types, change to VnstockType
* Eliminate simple stock.price, change to stock.quote
* Add trading.topGainers, trading.topLosers
* Change pass params to object params

## vnstock-js 0.4.3 release
* Hotfix Company
* Add simple stock.quote, similar to stock.price

## vnstock-js 0.4.2 release
* Hotfix @ alias

## vnstock-js 0.4.1 release
Note: got issues, should update to latest
* Fix README
* Change export

## vnstock-js 0.4.0 release
Note: got issues, should update to latest
* Add Gold Price SJC
* Re-organize codebase
* Hotfix error call to VCI avoid bot

## vnstock-js 0.3.1 release
* Add Gold Price V2 (giavang.net)
* Export Model

## vnstock-js 0.3.0 release
* Remove support **TCBS**
* Refactor

## vnstock-js 0.2.0 release
Release with the following improvements:

* Support **VCI** source
  * Listing: **Symbols By Exchange**, **Symbols By Industries**, **Industry ICB** ,**Symbols By Group**.
  * Financials Report: **Balance Sheet**, **Income Statement**, **Cashflow**.
* Support **Exchange Rates** on Commodity Prices.

## vnstock-js 0.1.0 release

Initial release with the following features:
* Retrieve **trading prices**,  **historical quotes** and **symbols listings** from **VCI** and **TCBS** stock market data.
* Support **Commodity Prices** *(Gold Price Vietnam)*.