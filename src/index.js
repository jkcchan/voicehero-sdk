const DEFAULT_CONFIG = {
    'version': '0.0.15',
    'platform': 'alexa',
    'redact': false
}
const axios = require('axios');
const instance = axios.create({
    baseURL: 'https://api.voicehero.ai',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

function prepareRequest(handlerInput, apiKey) {
    return {
        'event': handlerInput.requestEnvelope,
        'type': 'incoming',
        'apiKey': apiKey
    }
}

function prepareResponse(handlerInput, response, apiKey, config) {
    sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    if (config['redact'] != false) {
        sessionAttributes = redactSessionAttributes(sessionAttributes, config['redact'])
    }
    return {
        'event': handlerInput.requestEnvelope,
        'type': 'outgoing',
        'apiKey': apiKey,
        'response': {
            'response': response,
            'sessionAttributes': sessionAttributes
        }
    }
}
const deleteKey = (obj, path) => {
    const _obj = JSON.parse(JSON.stringify(obj));
    const keys = path.split('.');

    keys.reduce((acc, key, index) => {
        if (index === keys.length - 1) {
            delete acc[key];
            return true;
        }
        return acc[key];
    }, _obj);

    return _obj;
}

function redactSessionAttributes(sessionAttributes, redactKeys) {
    var redactedSessionAttributes = sessionAttributes
    for (i in redactKeys) {
        redactedSessionAttributes = deleteKey(redactedSessionAttributes, redactKeys[i])
    }
    return redactedSessionAttributes
}
async function sendToVoiceHero(data) {
    return instance.post({
        data: {
            "MessageBody": data
        }
    })
}
function replaceWithDefault(config){
    for(key in DEFAULT_CONFIG){
        if(config[key] === undefined){
            config[key] = DEFAULT_CONFIG[key]
        }
    }
    return config
}
module.exports = function (apiKey, config = {}) {
    // check if api key is legit
    if (!((typeof apiKey === 'string' || apiKey instanceof String))) {
        // its not astring
        return false
    }
    // overwrite default config
    config = replaceWithDefault(config);
    const VoiceHeroRequestInterceptor = {
        process(handlerInput) {
            return new Promise((resolve, reject) => {
                data = prepareRequest(handlerInput, apiKey)
                instance.post('/track', {
                        "MessageBody": data
                    })
                    .then((d) => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        }
    };
    const VoiceHeroResponseInterceptor = {
        process(handlerInput, response) {
            data = prepareResponse(handlerInput, response, apiKey, config)
            return new Promise((resolve, reject) => {
                instance.post('/track', {
                        "MessageBody": data
                    })
                    .then((d) => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        }
    };
    return {
        request: VoiceHeroRequestInterceptor,
        response: VoiceHeroResponseInterceptor
    }
}