var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    
  if (event.requestContext.http.method != 'GET') {
    const response = {
      statusCode: 405,
      body: 'Metodo ' + event.requestContext.http.method + ' non consentito.',
    };
    return response;
  }
    
  //Ottenimento informazioni
  var params_scan = {
    TableName: 'garedb',
  };    
  var gare = await db.scan(params_scan).promise();
    
  var result = new Object();
  result.count = 0;
  result.races = new Array();
  gare.Items.forEach(function(elem){
    result.count++;
    var gara = new Object();
    gara.race_id = elem.id;
    gara.race_name = elem.race_name;
    gara.file_name = elem.file_name;
    gara.race_date = elem.race_date;
    result.races.push(gara);
  });
    
  const response = {
    statusCode: 200,
    body: JSON.stringify(result),
  };
  return response;
};
