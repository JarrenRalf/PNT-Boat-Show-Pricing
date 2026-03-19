function importShopify()
{
  var file = DriveApp.getFilesByName("products_export_1.csv").next();
  var shopifyData = Utilities.parseCsv(file.getBlob().getDataAsString());
  var sheet = SpreadsheetApp.getActive().getSheetByName("FromShopifyWebsite")
  sheet.getRange(1, 1, shopifyData.length, shopifyData[0].length).setNumberFormat('@').setValues(shopifyData);

  var file = DriveApp.getFilesByName("BoatShowPrice.csv").next();
  var newPriceData = Utilities.parseCsv(file.getBlob().getDataAsString());
  var sheet = SpreadsheetApp.getActive().getSheetByName("BoatShowPriceFromAdagio_ONLY")
  sheet.getRange(1, 1, newPriceData.length, newPriceData[0].length).setNumberFormat('@').setValues(newPriceData);  
}

/**
 * This function was originally designed such that the Boat Show prices take contained ONLY boat show sales items and NOTHING in addtion. 
 * ** Might want to change eventually to make it more robust. What is the expected input of data going to look like?
 * 
 */
function updatePrice()
{
  var jan14 = new Date(2026, 0, 14); // Remember: The second argument is MONTHS with a starting index of 0!
  var jan18 = new Date(2026, 0, 18);
  jan14.setHours(jan14.getHours() - 1);
  jan18.setHours(jan18.getHours() + 1);
  jan14 = jan14.getTime();
  jan18 = jan18.getTime();
  const spreadsheet = SpreadsheetApp.getActive();
  const boatShowPriceSheet = spreadsheet.getSheetByName('BoatShowPriceFromAdagio_ONLY')
  const shopifyDataSheet = spreadsheet.getSheetByName('FromShopifyWebsite')
  const [fromShopifyData, numItemsOnShopify] =  generateData(shopifyDataSheet)
  var boatShowPriceData = boatShowPriceSheet.getSheetValues(1, 1, boatShowPriceSheet.getLastRow(), boatShowPriceSheet.getLastColumn());
  const header = fromShopifyData.shift();
  const MASTER_SKU = header.indexOf('Handle')
  const SKU = header.indexOf('Variant SKU')
  const PRICE = header.indexOf('Variant Price')
  const COMPARE_AT_PRICE = header.indexOf('Variant Compare At Price')
  const OPTION_ONE_VALUE_INDEX = header.indexOf('Option1 Value');
  const OPTION_TWO_VALUE_INDEX = header.indexOf('Option2 Value');
  var saleStartDate, saleEndDate;
  var masterSkuList = []

  for (var i = 0; i < numItemsOnShopify - 1; i++)
  {
    for (var j = 0; j < boatShowPriceData.length; j++)
    {
      
      if (fromShopifyData[i][SKU] !== '' && ((boatShowPriceData[j][0].toString()[0] == "'" && boatShowPriceData[j][0].toString().substring(1).toUpperCase().trim() === fromShopifyData[i][SKU].toString().toUpperCase().trim()) 
          || fromShopifyData[i][SKU].toString().toUpperCase().trim() == boatShowPriceData[j][0].toString().toUpperCase().trim())) // Match SKUs
      {
        masterSkuList.push(fromShopifyData[i][MASTER_SKU])
        saleStartDate = boatShowPriceData[j][4].toString().split('.');
        saleEndDate = boatShowPriceData[j][5].toString().split('.');
        boatShowPriceData[j][4] = new Date(saleStartDate[2], Number(saleStartDate[1]) - 1, saleStartDate[0]).getTime()
        boatShowPriceData[j][5] = new Date(saleEndDate[2], Number(saleEndDate[1]) - 1, saleEndDate[0]).getTime()

        if (boatShowPriceData[j][4] >= jan14 && boatShowPriceData[j][5] <= jan18 && boatShowPriceData[j][3] != 0) // Within boat show dates and sale price not blank or zero
        {
          fromShopifyData[i][PRICE] = boatShowPriceData[j][3]; // Sale Price to Shopify's Variant Price
          fromShopifyData[i][COMPARE_AT_PRICE] = boatShowPriceData[j][2]; // Base Price to Shopify's Variant Compare at Price
        }
        break;
      }
    }
  }

  const shopifyData = fromShopifyData.filter(d => masterSkuList.includes(d[0]) && d[SKU] !== '') // If SKU is blank then we assume that the line represents a picture on the website 

  var items_TwoOptions = [], items_OneOption = [], items_ZeroOptions;

  items_ZeroOptions = shopifyData.filter(item => {
    if (item[OPTION_TWO_VALUE_INDEX] !== '') // Option2 Value is not blank
      items_TwoOptions.push(item);
    else if (item[OPTION_ONE_VALUE_INDEX] !== 'Default Title') // Option1 Value is not 'Default Title'
      items_OneOption.push(item)
    else
      return true;

    return false
  });

  var groupedData = [header]
                    .concat((items_TwoOptions.length !== 0) ? items_TwoOptions : [['No items found that are on sale with two option values.', '', '', '', '', '', 'Two Options', '', '']],
                      [['', '', '', '', '', '', '', '', '']],
                      [header],
                      (items_OneOption.length !== 0) ? items_OneOption : [['No items found that are on sale with one option value.', '', '', '', '', '', 'One Option', '', '']],
                      [['', '', '', '', '', '', '', '', '']],
                      [header],
                      (items_ZeroOptions.length !== 0) ? items_ZeroOptions : [['No items found that are on sale with zero option values.', '', '', '', '', '', 'Zero Options', '', '']])

  spreadsheet.getSheetByName('Output').clearContents().getRange(1, 1, groupedData.length, groupedData[0].length).setValues(groupedData);
}

/**
* This function generates the data used to derive all of the sheets, including additional headers sent as a String representing the additional columns needed.
*
* @param   {Sheet}      sheet   The sheet that the imported Data will come from
* @param  {String[]} ...varArgs A variable number of arguments which will represent additional header titles
* @throws  errorMessage   If the headers in the data do not match what is expected. 
* @return {Object[][], Number} [data, numRows] The chosen (and relevant) set of data, along with the number of rows in the data
* @author Jarren Ralf
*/
function generateData(sheet, ...varArgs)
{
  var nRows = sheet.getLastRow();
  var nCols = sheet.getLastColumn();
  var fullData = sheet.getSheetValues(1, 1, nRows, nCols);
  var sheetName = sheet.getSheetName();
  var str = "Following Header Titles Not Found On The " + sheetName + " Sheet:";
  var columnHeaderTitles = ["Handle", "Title", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Variant SKU", "Variant Price", "Variant Compare At Price"];
  var columnsToKeep = [];
  const STATUS = fullData[0].indexOf('Status');
  
  // Add the additional arguments as column headers
  if (varArgs.length != 0)
    columnHeaderTitles.push(...varArgs);
  
  var numColHeaderTitles = columnHeaderTitles.length;
  
  for (var j = 0; j < numColHeaderTitles; j++)
  {
    for (var i = 0; i < fullData[0].length; i++)
    {
      if (fullData[0][i] == columnHeaderTitles[j])
      {
        columnsToKeep.push(i);
        break;
      }
      else if (i == fullData[0].length - 1) // We have reached the end of the list and haven't found the Header Title in the data
        str += ' ' + columnHeaderTitles[j] + ',';
    }
  }

  if (sheetName === 'FromShopifyWebsite')
  {
    var header = fullData.shift().filter((_, index) => columnsToKeep.indexOf(index) !== -1);
    var data = fullData.filter((_, index, array) => {
      var n = index;
      while (!array[n][STATUS])
        n--;
      return array[n][STATUS] != 'archived'; // Keep the items that have a status of active or draft
    }).map(value => value.filter((_, index) => columnsToKeep.indexOf(index) !== -1)) // Keep only the columns that match the chosen headers
    data.unshift(header)
  }
  else
    var data = fullData.map(value => value.filter((_, index) => columnsToKeep.indexOf(index) !== -1)); // Keep only the columns that match the chosen headers

  var numRows = data.length;
  var errorMessage = str.substring(0, str.length - 1); // Remove the last comma in order to replace it with a period
  errorMessage += ". To troubleshoot this issue: 1) Make sure the data was imported as expected."
               +  "\n    2) Make sure the column header is spelt exactly correct inside the function you just ran, and in the generateData() function."
               +  "\n\nOtherwise, consider making adjustments to the generateData() function."
  
  // If one of the headers couldn't be found, throw the error message
  if (numColHeaderTitles !== columnsToKeep.length)
    throw new Error(errorMessage);

  return [data, numRows];
}