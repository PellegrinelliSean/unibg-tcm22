var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var db = new AWS.DynamoDB.DocumentClient();

var token_gen = require('crypto');

exports.handler = async (event) => {
  if (event.requestContext.http.method != 'POST') {
    const response = {
      statusCode: 405,
      body: 'Metodo ' + event.requestContext.http.method + ' non consentito.',
    };
    return response;
  }
  
  //Ottenimento parametri da POST
  var http_params = new Object();
  var body = JSON.parse(event.body);
  if (!(body.hasOwnProperty('race_name') && body.hasOwnProperty('race_date') && body.hasOwnProperty('email'))) {
    const response = {
      statusCode: 400,
      body: 'Dati forniti non corretti.',
    };
    return response;
  }else {
    http_params.race = body.race_name;
    http_params.date = body.race_date;
    http_params.email = body.email;
  }
  
  //scansione db per calcolare il prossimo id disponibile e ottenere i token utilizzati
  var params_scan = {
        ProjectionExpression: 'id, auth_token',
        TableName: 'garedb',
  };
  var db_list = await db.scan(params_scan).promise();
    
  var new_id = -1;
  var used_tokens = new Array();
  db_list.Items.forEach(function(elem){
    if(elem.id > new_id)
      new_id = elem.id;
    used_tokens.push(elem.auth_token);
  });
  new_id++;
  
  //creazione nome file
  var file_name = http_params.race + '_id' + new_id + '.xml';
  file_name = file_name.replace(' ', '_');
  
  //creazione token
  var token;
  do {
    token = token_gen.randomBytes(10).toString('hex');
  }while(used_tokens.includes(token));
  
  //creazione voce del database
  const params_db = {
    TableName : 'garedb',
    Item: {
      id: new_id,
      file_name: file_name,
      race_name: http_params.race,
      race_date: http_params.date,
      email: http_params.email,
      auth_token: token,
    }
  };
  await db.put(params_db).promise();
  
  //risposta
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      'token': token,
      'id': new_id,
    }),
  };
  return response;
};
