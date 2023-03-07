function importShopify()
{
  var file = DriveApp.getFilesByName("products_export_1.csv").next();
  var shopifyData = Utilities.parseCsv(file.getBlob().getDataAsString());
  var sheet = SpreadsheetApp.getActive().getSheetByName("FromShopify")
  sheet.getRange(1, 1, shopifyData.length, shopifyData[0].length).setNumberFormat('@').setValues(shopifyData);

  var file = DriveApp.getFilesByName("BoatShowPrice.csv").next();
  var newPriceData = Utilities.parseCsv(file.getBlob().getDataAsString());
  var sheet = SpreadsheetApp.getActive().getSheetByName("BoatShowPrice")
  sheet.getRange(1, 1, newPriceData.length, newPriceData[0].length).setNumberFormat('@').setValues(newPriceData);  
}

function updatePrice()
{
  const feb1 = new Date(2023, 2, 1);
  const feb5 = new Date(2023, 2, 5);
  const sheets = SpreadsheetApp.getActive().getSheets();
  const fromShopifyData = sheets[1].getRange('A:T').getValues();
  const boatShowPriceData = sheets[2].getRange('A2:F').getValues();
  const numItemsOnShopify = fromShopifyData.length;
  var d1, d2;

  for (var i = 1; i < numItemsOnShopify; i++)
  {
    for (var j = 0; j < boatShowPriceData.length; j++)
    {
      if (fromShopifyData[i][14].toString().toUpperCase() == boatShowPriceData[j][0].toString().toUpperCase()) // Match SKUs
      {
        Logger.log('Item\'s Matched')
        d1 = boatShowPriceData[j][4].toString().split('.');
        d2 = boatShowPriceData[j][5].toString().split('.');
        boatShowPriceData[j][4] = new Date(d1[2], d1[1] - 1, d1[0]).getTime()
        boatShowPriceData[j][5] = new Date(d2[2], d2[1] - 1, d2[0]).getTime()

        if ( boatShowPriceData[j][4] >= feb1 && boatShowPriceData[j][5] <= feb5 && boatShowPriceData[j][3] != 0) // Within boat show dates and sale price not blank or 
        {
          fromShopifyData[i][19] = boatShowPriceData[j][3]; // Sale Price to Shopify's Variant Price
          fromShopifyData[i][20] = boatShowPriceData[j][2]; // Base Price to Shopify's Variant Compare at Price
        }
        break;
      }
    }
  }

  // const output = fromShopifyData.map(row => [...row.slice(0,2), ...row.slice(6,10), ...row.slice(12, 13), ...row.slice(17, 19)])
  sheets[3].getRange(1, 1, numItemsOnShopify, fromShopifyData[0].length).setValues(fromShopifyData);
}