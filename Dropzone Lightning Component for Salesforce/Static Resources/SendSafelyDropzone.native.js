function SendSafelyDropzone (apiKey, domElement, urlElement) {
  this.url = 'https://app.sendsafely.com';

  this.INJECTED_TEXT = '\n\nThis ticket includes a secure attachment. Use this link to access the attached files:\n {url}';
  this.CREATING_ENTROPY_MSG = 'We need some random data to generate a key. Move your mouse quickly over the box above: {percent}%';
  this.FILE_ROW_STYLE = 'background: #F8F8F8; border-radius: 3px; clear: left; float: left; font-size: 11px; margin: 10px 0px 0px 0px; padding: 3px 10px; position: relative; overflow: hidden; width: 100%;';
  this.FILE_ROW_CLASSES = '';
  this.PROGRESS_STYLE = 'background: rgba(0,0,0,0.04); bottom: 0; left: 0; position: absolute; right: 0; top: 0; -webkit-transition-property: width; -moz-transition-property: width; transition-property: width; -webkit-transition-duration: 0.5s; -moz-transition-duration: 0.5s; transition-duration: 0.5s; -webkit-transition-timing-function: linear; -moz-transition-timing-function: linear; transition-timing-function: linear; width: 3%;';
  this.PROGRESS_CLASSES = '';
  this.UPLOAD_PERCENTAGE_STYLE = 'color: #888; float: right; font-weight: bold; margin-left: 15px; position: relative; z-index:1';
  this.UPLOAD_PERCENTAGE_CLASS = '';
  this.FAILURE_CLASS = 'alert-danger';
  this.DROPZONE_TEXT = 'Drag files here or click to add file';
  this.FILES_NOT_DONE_WARNING = 'Please wait until all files are done uploading';
  this.STILL_WORKING_MESSAGE = 'Still working...wait a few seconds and try again.';
  this.FILE_COMPLETED_TEXT = 'Completed';
  this.FAILURE_STYLE = 'padding: 7px; margin-bottom: 20px; margin-top: 10px; text-align: center; border: 1px solid transparent; border-radius: 4px; color: #a94442; background-color: #f2dede; border-color: #ebccd1; -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box;';
  this.INFO_CLASS = 'alert-info';
  this.INFO_STYLE = 'padding: 7px; margin-bottom: 20px; margin-top: 10px; text-align: center; border: 1px solid transparent; border-radius: 4px; color: #8a6d3b; background-color: #fcf8e3; border-color: #faebcc; -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box;';
  this.DROPZONE_STYLE = 'border: 2px dashed #F3F3F3; border-color: rgba(0,0,0,0.05); font-size: 14px; text-align: center; padding-top: 10px; padding-bottom: 10px;';
  this.BOXING_CSS = '-webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box; -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box;';
  this.WIDTH = '100%';
  this.HEIGHT = '100%';
  this.BACKGROUND_COLOR = '#ffffff';
  this.DROP_TEXT_COLOR = '#666666';
  this.UPLOAD_API = undefined;
  this.logoPath = 'https://app-static.sendsafely.com/images/external/logo.png';
  this.ongoingUploadsCallback = function(){};

  this.apiKey = apiKey;
  this.keyCodesUploaded = false;
  this.disableAutoSubmit = false;
  this.hasUploadedFiles = false;
  this.packageIsFinalized = false;
  this.nbrOfFilesAttached = 0;

  this.noKeycodeUrl = undefined;
  this.unconfirmedSender = undefined;
  this.confirmedSenderToken = undefined;
  this.dropZone = undefined;

  this.eventListener = {};
  this.listenerTracker = {};
  this.filePrefix = undefined;
  this.fileUploadedCallback = undefined;
  
  if(!window.hasOwnProperty("SendSafely")) {
      window.SendSafely = { messageListener: [] };
  }

  var myself = this;

  this.initialize = function () {

    if(myself.isBrowserSupported()) {
      myself.clearMessageListener();
      // Clear out all css on the div
      domElement.setAttribute('style', '');
      domElement.setAttribute('class', '');

      myself.createIFrameElement(domElement);

      myself.iframe.onload = function() {
        var message = {};
        message['command'] = 'api-key';
        message['key'] = myself.apiKey;
        message['filePrefix'] = myself.filePrefix;
        if(myself.UPLOAD_API !== undefined) {
          message['uploadAPI'] = myself.UPLOAD_API;
        }

        send(message);
        
        var hostedDzTimer = setInterval(function(){
            send(message);
        },500);

        //Listener to stop HostedDropzone timer once api-key message confirmed received
        myself.addFrameListener('api-key-received',function(event) {
            clearInterval(hostedDzTimer);
        });
        myself.addFrameListener('file-attached', function(data) {
          myself.nbrOfFilesAttached++;
          myself.handleAttachedFile(data.name, data.fileId, data.packageCode);
        });        
        myself.addFrameListener('file-attached-placeholder', function(data) {
        	myself.handleAttachedFile(data.name, data.fileId, data.packageCode);
        });
        myself.addFrameListener('file-progress', function(data) {
          myself.handleFileProgress(data.fileId, data.progress);
        });
        myself.addFrameListener('file-uploaded', function(data) {
          myself.packageCode = data.packageCode;
          myself.fileUploaded(data.fileId);
          
          if(myself.fileUploadedCallback) {
        	  myself.fileUploadedCallback({fileId: data.fileId, fileName: data.fileName});
          }
        });
        myself.addFrameListener('sendsafely.message.uploaded', function(data){
        	myself.packageCode = data.data.packageCode;
        });
        myself.addFrameListener('file-removed', function(data) {
          myself.fileRemoved(data.fileId);
        });
        myself.addFrameListener('error', function(data) {
          myself.failure(data.message);
        });
        myself.addFrameListener('entropy', function(data) {
          myself.updateEntropy(data.entropy);
        });
        myself.addFrameListener('entropy-ready', function() {
        	if(document.getElementById('sendsafely-error-message').classList.indexOf(myself.INFO_CLASS) > -1) {
                document.getElementById('sendsafely-error-message').style.display = 'none';
            }	
        });
        myself.addFrameListener('file-remove-error', function() {
          myself.fileRemovedFailed(data.fileId);
        });
        myself.addFrameListener('keycodes-uploaded', function() {
          myself.keyCodesUploaded = true;
        });
        myself.addFrameListener('ongoing-uploads', function(data) {
          myself.ongoingUploadsCallback(data.ongoingUploads);
        });
        myself.addFrameListener('set-unconfirmed-sender', function(data) {
            myself.setUnconfirmedSender(data.unconfirmedSender);
        });
        myself.addFrameListener('set-confirmed-sender-token', function(data) {
          myself.setConfirmedSenderToken(data.confirmedSenderToken);
        });
      };

      if(myself.disableAutoSubmit !== true) {
        document.querySelector('form').addEventListener('submit', function (event) {
              if (myself.nbrOfFilesAttached > 0 && !myself.packageIsFinalized) {
                  var form = this;

                  if (myself.unconfirmedSender != null) {
                      this.setUnconfirmedSender(myself.unconfirmedSender);
                  }
                  if (myself.confirmedSenderToken != null) {
                      this.setConfirmedSenderToken(myself.confirmedSenderToken);
                  }
                  myself.finalizePackage(function (message) {
                      var text = myself.INJECTED_TEXT;
                      text = text.replace('{url}', message);

                      urlElement.value += text;

                      form.submit();
                  });

                  event.preventDefault();
              }
          });
      }
    } else {
      myself.browserIsNotSupported();
    }
  };

  this.isBrowserSupported = function() {
    var supported =  Blob != undefined && Worker != undefined && XMLHttpRequest != undefined;  
    
	// lightning component
	if(window.hasOwnProperty('$A')) {
    	supported = true;
    }
	return supported;
  };

  this.browserIsNotSupported = function () {

  };

  this.updateEntropy = function(entropy) {
    document.getElementById('sendsafely-error-message').classList.remove(myself.FAILURE_CLASS, myself.INFO_CLASS);
    document.getElementById('sendsafely-error-message').setAttribute('class',myself.INFO_CLASS);
    document.getElementById('sendsafely-error-message').setAttribute('style', myself.INFO_STYLE);
    document.getElementById('sendsafely-error-message').style.display = 'block';

    var message = myself.CREATING_ENTROPY_MSG;
    message = message.replace('{percent}', Math.round(entropy));
    document.getElementById('sendsafely-error-message').textContent = message;
  };

  this.failure = function (message) {
	var parent = document.getElementById('upload-item-placeholder');

	if(parent !== null) {
		parent = parent.parentNode
		parent.removeChild(document.getElementById('upload-item-placeholder'));
	}
	
    document.getElementById('sendsafely-error-message').classList.remove(myself.FAILURE_CLASS, myself.INFO_CLASS);
    document.getElementById('sendsafely-error-message').setAttribute('class',myself.FAILURE_CLASS);
    document.getElementById('sendsafely-error-message').setAttribute('style', myself.FAILURE_STYLE);
    document.getElementById('sendsafely-error-message').textContent = message;
    document.getElementById('sendsafely-error-message').style.display = 'block';

    setTimeout(function() {document.getElementById('sendsafely-error-message').style.display = 'none';}, 5000);
  };

  this.fileUploaded = function (fileId) {
    var elem = document.querySelector('li[data-upload-id="' + fileId + '"]');
    elem.setAttribute('aria-busy', 'false');
    // elem.querySelector('a[data-upload-link]').setAttribute("href", "https://www.sendsafely.com");
    // elem.querySelector('p[data-upload-path]').innerHTML += 'https://www.sendsafely.com';

    elem.querySelector('div[data-upload-progress]').style.width = '100%';

    document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-remove]').style.display = 'block';
    document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-percentage]').textContent = myself.FILE_COMPLETED_TEXT;
  };

  this.handleAttachedFile = function (filename, fileId, packageCode) {
    myself.packageCode = packageCode;


    var liNode = document.createElement('li');
    
    if(!fileId) {
    	liNode.setAttribute('id','upload-item-placeholder');
    }
    
    liNode.setAttribute('class','sendsafely-upload-item ' + myself.FILE_ROW_CLASSES);
    liNode.setAttribute('data-upload-id', htmlEncode(fileId));
    liNode.style.background = '#F8F8F8';
    liNode.style.borderRadius = '3px';
    liNode.style.clear = 'left';
    liNode.style.cssFloat = 'left';
    liNode.style.fontSize = '11px';
    liNode.style.margin = '10px 0px 0px 0px';
    liNode.style.padding = '3px 10px';
    liNode.style.position = 'relative';
    liNode.style.overflow = 'hidden';
    liNode.style.width = '100%';
    liNode.style.webkitBoxSizing = 'border-box';
    liNode.style.boxSizing = 'border-box';

    var imgNode = document.createElement('img');
    imgNode.setAttribute('src', myself.createPadlockImage());
    imgNode.setAttribute('width','14px');
    imgNode.setAttribute('height','14px');

    var childDiv = document.createElement('div');
    childDiv.style.verticalAlign = 'top';
    childDiv.style.display = 'inline';
    childDiv.style.marginTop = '2px';
    childDiv.innerHTML = htmlEncode(filename);

    var spanNode = document.createElement('span');
    spanNode.setAttribute('data-upload-remove','');
    spanNode.style.color = '#888';
    spanNode.style.cursor = 'pointer';
    spanNode.style.cssFloat = 'right';
    spanNode.style.fontWeight = 'bold';
    spanNode.style.marginLeft = '15px';
    spanNode.style.position = 'relative';
    spanNode.style.zIndex = '1';
    spanNode.textContent = 'x';

    var spanNodePercentage = document.createElement('span');
    spanNodePercentage.setAttribute('class', myself.UPLOAD_PERCENTAGE_CLASS);
    spanNodePercentage.setAttribute('data-upload-percentage','');
    spanNodePercentage.style.color = '#888';
    spanNodePercentage.style.cssFloat = 'right';
    spanNodePercentage.style.fontWeight = 'bold';
    spanNodePercentage.style.marginLeft = '15px';
    spanNodePercentage.style.position = 'relative';
    spanNodePercentage.style.zIndex = '1';

    var progressChildDiv = document.createElement('div');
    progressChildDiv.setAttribute('class',myself.PROGRESS_CLASSES);
    progressChildDiv.setAttribute('data-upload-progress','');
    progressChildDiv.style.background = 'rgba(0,0,0,0.04)';
    progressChildDiv.style.bottom = '0';
    progressChildDiv.style.left = '0';
    progressChildDiv.style.position = 'absolute';
    progressChildDiv.style.right = '0';
    progressChildDiv.style.top = '0';
    progressChildDiv.style.webkitTransitionProperty = 'width';
    progressChildDiv.style.transitionProperty = 'width';
    progressChildDiv.style.webkitTransitionDuration = '0.5s';
    progressChildDiv.style.transitionDuration = '0.5s';
    progressChildDiv.style.webkitTransitionTimingFunction = 'linear';
    progressChildDiv.style.transitionTimingFunction = 'linear';
    progressChildDiv.style.width = '3%';

    liNode.appendChild(imgNode);
    liNode.appendChild(childDiv);
    liNode.appendChild(spanNode);
    liNode.appendChild(spanNodePercentage);
    liNode.appendChild(progressChildDiv);

    document.getElementById('sendsafely-attached-file-list').appendChild(liNode);
    
    if(fileId) {
    	var placeholder = document.getElementById('upload-item-placeholder');
    	
    	if(placeholder) {
        	var parent = document.getElementById('upload-item-placeholder').parentNode;
    		parent.removeChild(placeholder);
    	}   	
    	
    	var clickHandler = function () {
	      myself.removeFile(this);
	    }

	    this.eventListener[fileId] = clickHandler;
	    // Set up remove event handler
	    document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-remove]').addEventListener("click", clickHandler);
    }
  };

  this.removeFile = function (elem) {
    var parent = elem.parentNode;
    var fileId = parent.dataset['uploadId'];

    send({command: 'remove-file', fileId: fileId});

    document.removeEventListener('click', this.eventListener[fileId]);
    delete this.eventListener[fileId];
  };

  this.fileRemoved = function (fileId) {
    myself.nbrOfFilesAttached--;
    var elem = document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-remove]');
    elem.parentNode.parentNode.removeChild(elem.parentNode);
  };

  this.fileRemovedFailed = function (fileId) {
    var clickHandler = function (elem) {
        myself.removeFile(elem);
    }
    this.eventListener[fileId] = clickHandler;
    document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-remove]').addEventListener("click", clickHandler);
  };

  this.handleFileProgress = function (fileId, progress) {
    var elem = document.querySelector('li[data-upload-id="' + fileId + '"] div[data-upload-progress]');
    elem.style.width = progress + '%';

    if (parseFloat(progress) <= 100) {
        var uploadPercentageElem = document.querySelector('li[data-upload-id="' + fileId + '"] span[data-upload-percentage]');
        if (uploadPercentageElem.textContent !== myself.FILE_COMPLETED_TEXT) {
            uploadPercentageElem.textContent = parseFloat(progress).toFixed(2) + '%';
        }
    }
  };

  this.addMessage = function(message) {
    send({command: "set-message", message: message});
    myself.hasMessage = true;
  };

  this.setUnconfirmedSender = function(unconfirmedSender){
	  send({command: "set-unconfirmed-sender", unconfirmedSender: unconfirmedSender});
  }

  this.setConfirmedSenderToken = function(confirmedSenderToken){
    send({command: "set-confirmed-sender-token", confirmedSenderToken: confirmedSenderToken});
  }
  this.createStaticURL = function (url) {
    if(url.indexOf("https://static-") < 0 && url.indexOf("https://") >= 0) {
      url = url.replace('https://', 'https://static-');
    }
    else if (url.indexOf("http://static-") < 0 && url.indexOf("http://") >= 0) {
      url = url.replace('http://', 'http://static-');
    }
    return url;
  };

  this.finalizePackage = function(callback, errorCallback) {
    myself.hasOngoingUploads(function(hasOngoingUploads) {
      
      if(!myself.listenerTracker.hasOwnProperty('error')) {
    	  myself.listenerTracker.error = true;
    	  myself.addFrameListener('error', onError);
      }
      //Do basic sanity checks here to make sure we are ready to finalize/submit
      if(!hasOngoingUploads && myself.packageCode !== undefined && myself.keyCodesUploaded || (myself.hasMessage && !hasOngoingUploads)) {
    	if(!myself.listenerTracker.hasOwnProperty('package-link')) {
    		myself.listenerTracker['package-link'] = true;
      		myself.addFrameListener('package-link', onPackageLink);
      	}        
        
    	sendCommand('finalize');
      } else {
        //Not ready, show a please wait message
        if (hasOngoingUploads || myself.packageCode === undefined)
        {
          myself.failure(myself.FILES_NOT_DONE_WARNING);
        }
        else
        {
          myself.failure(myself.STILL_WORKING_MESSAGE);
        }
        if(errorCallback !== undefined) {errorCallback();}
      }
      
      function onError(event) {
      	if(errorCallback !== undefined) {
      		  errorCallback();
        }    	
      }
      
      function onPackageLink(event) {
          myself.packageIsFinalized = true;
          myself.noKeycodeUrl = event.noKeycodeUrl;
          callback(event.url);
      }
    });
  };

  this.hasOngoingUploads = function(callback) {

    myself.ongoingUploadsCallback = callback;

    sendCommand('has-ongoing-uploads');
  };

  this.addFrameListener = function (command, callback) {
    function listener(event) {
        if (event.data.command == command) {
            callback(event.data);
            event.stopPropagation();
        }
    }

    window.SendSafely.messageListener.push(listener);
    window.addEventListener("message", listener);
  }

  this.clearMessageListener = function () {
    while(window.SendSafely.messageListener.length > 0) {
        var listener = window.SendSafely.messageListener.shift();
        window.removeEventListener("message", listener);      
    }
  }

  this.createIFrameElement = function (elem) {
    var output = document.createElement('div');
    output.style.position = 'relative';
    output.style.width = myself.WIDTH;
    output.style.height = myself.HEIGHT;
    var iframeNode = document.createElement('div');
    iframeNode.setAttribute('id', 'sendsafely-iframe');
    iframeNode.style.position = 'absolute';
    iframeNode.style.top = '0';
    iframeNode.style.left = '0';
    iframeNode.style.width = '100%';
    iframeNode.style.height = '100%';
    iframeNode.style.zIndex = '10';
    var dropzoneNode = document.createElement('div');
    dropzoneNode.setAttribute('id', 'sendsafely-dropzone');
    dropzoneNode.style.position = 'relative';
    dropzoneNode.style.top = '0';
    dropzoneNode.style.left = '0';
    dropzoneNode.style.width = '100%';
    dropzoneNode.style.height = '100%';
    dropzoneNode.style.zIndex = '1';
    dropzoneNode.style.overflow = 'hidden';
    dropzoneNode.appendChild(myself.renderDropzone());
    output.appendChild(iframeNode);
    output.appendChild(dropzoneNode);
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", myself.createStaticURL(myself.url) + "/html/dropzone.native.html");
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.seamless = "seamless";
    iframe.scrolling = "no";
    elem.appendChild(output);

    document.getElementById('sendsafely-iframe').appendChild(iframe);
    document.getElementById('sendsafely-iframe').style.filter = 'alpha(opacity=0)';
    document.getElementById('sendsafely-iframe').style.opacity = '0.01';

    var fileListNode = document.createElement('div');
    var fileListUnorderedListNode = document.createElement('ul');
    fileListUnorderedListNode.setAttribute('id', 'sendsafely-attached-file-list');
    fileListUnorderedListNode.style.margin = '0';
    fileListUnorderedListNode.style.overflow = 'hidden';
    fileListUnorderedListNode.style.padding = '0';

    fileListNode.appendChild(fileListUnorderedListNode);

    var errorBoxNode = document.createElement('div');
    errorBoxNode.setAttribute('id', 'sendsafely-error-message');
    errorBoxNode.setAttribute('class', 'alert alert-dismissible');
    errorBoxNode.setAttribute('role', 'alert');
    errorBoxNode.style.display = 'none';
    errorBoxNode.style.marginTop = '5px';
    errorBoxNode.style.webkitBoxSizing = 'border-box';
    errorBoxNode.style.boxSizing = 'border-box';

    elem.appendChild(fileListNode);
    elem.appendChild(errorBoxNode);

    myself.iframe = iframe;
  };

  this.addDocumentEventHandlers = function() {
    document.getElementById('sendsafely-iframe').addEventListener('dragover', myself.handleDragOverDropzone, false);
    document.getElementById('sendsafely-iframe').addEventListener('dragleave',myself.handleDragLeaveDropzone, false);
  };

  this.handleDragOverDropzone = function (evt) {
    evt.dataTransfer.dropEffect = 'copy';
    document.getElementById('sendsafely-dropzone').style.border = "2px dashed black";
  };

  this.handleDragLeaveDropzone = function (evt) {
    document.getElementById('sendsafely-dropzone').style.border = "2px dashed #F3F3F3";
  };

  this.renderDropzone = function() {
    var main = document.createElement('div');
    main.style.width = '100%';
    main.style.border = '2px dashed #F3F3F3';
    main.style.borderColor = 'rgba(0,0,0,0.05)';
    main.style.fontSize = '14px';
    main.style.textAlign = 'center';
    main.style.paddingTop = '10px';
    main.style.paddingBottom = '10px';
    main.style.color = myself.DROP_TEXT_COLOR;
    main.style.backgroundColor = myself.backgroundColor;
    main.style.webkitBoxSizing = 'border-box';
    main.style.boxSizing = 'border-box';
    main.setAttribute('align', 'center');

    var child = document.createElement('div');
    child.style.margin = '0 auto';
    child.style.cssFloat = 'center';
    child.style.minWidth = '45%';
    child.style.maxWidth = '95%';
    child.style.display = 'inline-block';

    var nestedChildText = document.createElement('span');
    nestedChildText.innerHTML = myself.DROPZONE_TEXT;

    var nestedChild = document.createElement('span');

    var nestedChildImage = document.createElement('IMG');
    nestedChildImage.setAttribute('src', myself.logoPath);
    nestedChildImage.style.width = '23px';
    nestedChildImage.style.height = '23px';
    nestedChildImage.style.marginRight = '5px';
    nestedChildImage.style.marginTop = '-2px';

    nestedChild.appendChild(nestedChildImage);
    child.appendChild(nestedChild);
    child.appendChild(nestedChildText);
    main.appendChild(child);

    return main;
  };

  this.sendFeedback = function(message) {
    var eventHandler = new EventHandler(myself);
    var request = new AnonymousRequest(eventHandler, myself.url, myself.apiKey);
    new SendFeedback(eventHandler, request).execute(message, undefined, true);
  };

  this.createPadlockImage = function () {
    return myself.logoPath;
  };

  function sendCommand(command) {
    send({command: command});
  }

  function send(data) {
    var win = myself.iframe.contentWindow;
    win.postMessage(data, myself.createStaticURL(myself.url));
  }

  function htmlEncode(stringToEncode) {
    var elem = document.createElement('div');
    elem.textContent = stringToEncode;
    return elem.innerHTML;
  }
}
function AnonymousRequest(eventHandler, url, apiKey, requestAPI) {

  var myself = this;

  this.apiPrefix = '/drop-zone/v2.0';
  this.url = url;
  this.apiKey = apiKey;
  this.eventHandler = eventHandler;

  this.sendRequest = function (requestType, messageData, a_sync){
    if (typeof a_sync === "undefined") {
        a_sync = true;
    }

    var d = new Deferred();
    var xhr = new XMLHttpRequest();
    xhr.open(requestType.HTTPMethod, myself.url + myself.apiPrefix + requestType.url, a_sync);

    xhr.setRequestHeader('Content-Type', requestType.mimetype);
    xhr.setRequestHeader('ss-api-key', myself.apiKey);
    xhr.setRequestHeader('ss-request-api', requestAPI);
    xhr.send(messageData == null ? null : JSON.stringify(messageData));

    xhr.onload = function (e) {
        if (this.status >= 200 && this.status < 300 || this.status === 304) {
            var data = '';

            if (this.status !== 304) {
                data = this.response;
            }
            d.resolve(this, [data]);
        } else {
            var response = '';
            var statusText = 'error';
            if (typeof this.response === 'string' && this.response.length > 0) {
                response = JSON.parse(this.response);
            }
            if (this.statusText.length > 0) {
                statusText = this.statusText;
            }
            d.reject(this, [this, statusText, response]);
        }
    }
    return d;
  };

  this.getHTTPObjForFileUpload = function (uri, messageData, boundary, a_sync) {

    var xhr = new XMLHttpRequest();
    var url = myself.url + myself.apiPrefix + uri;

    xhr.open('POST', url, a_sync);

    xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
    xhr.setRequestHeader('ss-api-key', myself.apiKey);
    xhr.setRequestHeader('ss-request-api', requestAPI);

    return xhr;
  };

  this.extend = function (a, b){
    for(var key in b)
      if(b.hasOwnProperty(key))
        a[key] = b[key];
    return a;
  }

}
function EventHandler(parent) {

  var myself = this;

  this.eventlist = {};
  this.ERROR_EVENT = 'sendsafely.error';

  // Inject into the parent
  if(parent !== undefined) {
    parent.on = function(eventStr, callback) {
      return myself.bind(eventStr, callback);
    };

    parent.unbind = function(eventStr, id) {
      myself.unbind(eventStr, id);
    };

    parent.isBound = function(eventStr) {
      myself.isBound(eventStr);
    };
  }

  this.bind = function (event, callback) {
    var list = myself.getList(event);
    list.push(callback);

    myself.eventlist[event] = list;

    return list.length-1;
  };

  this.unbind = function (event, id) {
    var list = myself.getList(event);

    if(id === undefined) { // Thrash the whole list
      list = undefined;
    }
    else if(list.length > id) {
      list[id] = undefined;
    }

    myself.eventlist[event] = list;
  };

  this.isBound = function(event) {
    return myself.eventlist[event] !== undefined && myself.eventlist[event].length > 0;
  };

  this.raise = function(event, data) {
    if(myself.eventlist[event] !== undefined) {
      var length = myself.eventlist[event].length;
      var i = 0;
      while(i<length && myself.eventlist[event] !== undefined) {
        var callback = myself.eventlist[event][i];
        if(callback != undefined) {
          callback(data);
        }
        i++;
      }
    }
  };

  this.raiseError = function(code, message, customError) {
    if(customError !== undefined && myself.eventlist[customError] !== undefined) {
      myself.eventlist[customError].forEach(function(callback) {
        if(callback != undefined) {
          callback(code, message);
        }
      });
    } else {
      if(myself.eventlist[myself.ERROR_EVENT] !== undefined) {
        //var data = {'error': code, 'message': message};
        myself.eventlist[myself.ERROR_EVENT].forEach(function(callback) {
          if(callback !== undefined) {
            callback(code, message);
          }
        });
      }
    }
  };

  this.getList = function(event) {
    if(myself.eventlist[event] === undefined) {
      myself.eventlist[event] = [];
    }

    return myself.eventlist[event];
  };

}
function ResponseParser(eventHandler) {

  this.eventHandler = eventHandler;
  this.defaultEventError = 'sendsafely.error';

  var myself = this;

  /**
   * Function used to deal with Errors, and callbacks for AJAX Requests.
   * Progress callback cannot be done when async is false.
   *
   * @param {promise} ajax AJAX Promise
   * @param {function} error_callback Function is called when there is an error with the function or when there is an error in the responce.
   * @param {function} success_callback Function is called when data is receved from the server with no errors.
   * @param {function} progress_callback Function is called when the data is being uploaded.
   */
  this.processAjaxData = function(ajax, success_callback, errorEvent) {
    ajax.fail(function (xhr, status, error) {
      // Wrap the error to a format we recognize.
      var data = {response: this.AJAX_ERROR, message: error.message};
      myself.raiseError(errorEvent, {'error': this.NETWORK_ERROR, 'data': data});
    }).done(function (data) {
          if(typeof data == "string"){
            data = JSON.parse(data);
          }
          if(data.response == "SUCCESS") {
            if(success_callback != undefined) {
              success_callback(data);
            }
          }
          else if(data.response == "TIMEOUT") {
            myself.eventHandler.raise('session.timeout', data.message);
          }
          else {
            myself.raiseError(errorEvent, {'error': data.response, 'data': data});
          }
        })
  };

  /**
   * Function used to deal with Errors, and callbacks for AJAX Requests.
   * Progress callback cannot be done when async is false.
   *
   * @param {promise} ajax AJAX Promise
   * @param {function} error_callback Function is called when there is an error with the function or when there is an error in the responce.
   * @param {function} success_callback Function is called when data is receved from the server with no errors.
   * @param {function} progress_callback Function is called when the data is being uploaded.
   */


  this.processAjaxDataRaw = function(ajax, callback, errorEvent) {
      ajax.fail(function (xhr, status, error) {
          var errorMessage;
          if(typeof error == "string"){
              errorMessage = error;
          } else {
              errorMessage = error.message;
          }
          // Wrap the error to a format we recognize.
          var data = {response: "AJAX_ERROR", message: "A server error has occurred (" + errorMessage + "). Please try again."};
          callback(data);
      }).done(function (data) {
          if(typeof data == "string"){
              data = JSON.parse(data);
          }
          callback(data);
      })
  };

  this.raiseError = function(customEvent, data) {
    myself.eventHandler.raiseError(data.error, data.data.message, customEvent);

  };

};

function SendFeedback (eventHandler, request) {
  this.request = request;
  this.endpoint = { "url": "/feedback/", "HTTPMethod" : "PUT", "mimetype": "application/json"};
  this.eventHandler = eventHandler;
  this.customErrorEvent = 'send.feedback.failed';
  this.responseParser = new ResponseParser(eventHandler);

  var myself = this;

  this.execute = function (message, stacktrace, async, callback) {
    var endpoint = myself.request.extend({}, myself.endpoint);

    var requestData = buildRequestData(message, stacktrace);
    var response = myself.request.sendRequest(endpoint, requestData, async);
    myself.responseParser.processAjaxData(response, function(res) {
      if(callback) {
        callback();
      }
    });
  };

  function buildRequestData(message, stacktrace) {
    var postData = {};
    postData.message = message;
    postData.stacktrace = stacktrace;
    return postData;
  }
}

function Deferred() {
  this._done = [];
  this._fail = [];
}

Deferred.prototype = {
  execute: function (list, args) {
    var i = list.length;

    // convert arguments to an array
    // so they can be sent to the
    // callbacks via the apply method
    args = Array.prototype.slice.call(args);

    while (i--) list[i].apply(args[0], args[1]);
  },
  resolve: function (arg) {
    this.execute(this._done, arguments);
  },
  reject: function () {
    this.execute(this._fail, arguments);
    return this;
  },
  done: function (callback) {
    this._done.push(callback);
    return this;
  },
  fail: function (callback) {
    this._fail.push(callback);
    return this;
  }
}

if(!window.SendSafelyDropzone) {
	window.SendSafelyDropzone = SendSafelyDropzone;
}