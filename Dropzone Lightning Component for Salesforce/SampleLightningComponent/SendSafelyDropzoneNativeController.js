({
    initSendSafely: function (component, event, helper) {
        var dropzoneId = "your_dropzone_id_here"; //Example: XYdVS1ZwcdeVJ-QzQ8bbz1txEongE-_e_cOGZB6xmBs
        var webToCaseURL = "https://webto.salesforce.com/servlet/servlet.WebToCase?encoding=UTF-8";
        var organizationId = "your_salesforce_organization_id_here"; //Example: 00D1N000003BrYX

        var form = component.find("newCase").getElement();
        form.setAttribute("action", webToCaseURL);

        var orgInput = component.find("orgid").getElement();
        orgInput.value = organizationId;

        var placeholderElement = component.find("dropzone-replacement-div").getElement();
        //The formField variable is not required by SendSafely in this implementation because widget.disableAutoSubmit is set to true, however we are setting anyway to prevent a Lightning undefined error.
        var formField = document.createElement("div");
        formField.setAttribute("id", "hidden-secure-link-field");
        //Create a new instance.
        var widget = new SendSafelyDropzone(dropzoneId, placeholderElement, formField);

        //Once created, we can specify any optional configurations here.
        widget.disableAutoSubmit = true;
        widget.url = "your_sendsafely_portal_url_here";
        widget.initialize();
        SendSafelyDropzone.dropZone = widget;
    },

    finalizePackage: function (component, event, helper) {
        var validate = component.get('c.validateFields');
        validate.setCallback(this, function (response) {
            var isValid = response.getReturnValue();
            var state = response.getState();
            if (state === "SUCCESS" && isValid) {
                var submit = event.getSource();
                submit.set("v.disabled", true);
                var widget = SendSafelyDropzone.dropZone;
                console.log("number of files: " + widget.nbrOfFilesAttached);
                if (widget.nbrOfFilesAttached > 0) {
                    widget.setUnconfirmedSender(component.find("email").getElement().value);
                    widget.finalizePackage($A.getCallback(function (url) {

                        var secureLink = url;
                        var description = component.find("description").getElement().value += "\n\nSecure Link \n\n " + url;
                        var action = component.get('c.createCase');
                        $A.enqueueAction(action);
                    }));
                } else {
                    var action = component.get('c.createCase');
                    $A.enqueueAction(action);
                }
            }
        });

        $A.enqueueAction(validate);
    },

    createCase: function (component, event, helper) {
        component.find("newCase").getElement().submit();
        component.find("newCase").getElement().style.display = "none";
        component.find("successMessage").getElement().style.display = "block";
    },
    validateFields: function (component, event, helper, test) {
        var isValid = true;
        if (!/(.+)@(.+){2,}\.(.+){2,}/.test(component.find("email").getElement().value)) {
            alert("You did not provide a valid email address");
            isValid = false;
            return isValid;
        }

        var nameValue = component.find("name").getElement().value;
        var subjectValue = component.find("subject").getElement().value;
        var descriptionValue = component.find("description").getElement().value;

        var validationFields = [nameValue, subjectValue, descriptionValue];

        for (var i = 0; i < validationFields.length; i++) {
            var fieldValue = validationFields[i];
            if (fieldValue.trim() === "") {
                alert("You must complete all input fields");
                isValid = false;
                return isValid;
            }
        }

        return isValid;
    }
})