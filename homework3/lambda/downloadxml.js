var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  
  if (event.requestContext.http.method != 'GET') {
    const response = {
      statusCode: 405,
      body: 'Metodo ' + event.requestContext.http.method + ' non consentito.',
    };
    return response;
  }
  
  //Acquisizione id da parametri (se non presente errore)
  if (!event.queryStringParameters || !event.queryStringParameters.id) {
      const response = {
      statusCode: 400,
      body: "Nessun id gara specificato.",
    };
    return response;
  }
  var id = event.queryStringParameters.id;
    
  //Verifica presenza di gara con id specificato e ottenimento nome
  var params_scan = {
    ProjectionExpression: 'id, file_name',
    TableName: 'garedb',
  };    
  var db_list = await db.scan(params_scan).promise();
    
  var file_name;
  var found = false;
  db_list.Items.forEach(function(elem){
    if(elem.id == id) {
      found = true;
      file_name = elem.file_name;
    }
  });
  
  if (!found) {
    const response = {
      statusCode: 400,
      body: "id gara non presente.",
    };
    return response;
  }

  const url = s3.getSignedUrl('getObject', {
    Bucket: 'garexml',
    Key: file_name,
    Expires: 300,
  });
  
  //var html = '<a href="' + url + '" download>Download</a>';

  //ottenimento xml da bucket s3
  const params_s3 = {
    Bucket: 'garexml',
    Key: file_name,
  };

  //controllo se il file esiste o se la gara è stata solo registrata
  try {
    await s3.headObject(params_s3).promise();
  } catch (error) {
    if (error.name === 'NotFound') {
      const response = {
        statusCode: 400,
        body: "Nessun dato sulla gara disponibile.",
      };
      return response;
    }
  }

  var xml;
  await s3.getObject(params_s3, function(err, data){
    if (err) {
      throw err;
    } if (data) {
      xml = data.Body.toString();
    }
  }).promise();
  
  //risposta
  const response = {
    statusCode: 200,
    headers: {
    'Content-Type': 'text/xml',
    'Content-Disposition': 'attachment; filename="' + file_name + '"',
    },
    body: xml,
  };
  return response;
};
