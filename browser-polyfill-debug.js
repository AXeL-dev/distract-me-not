console.log('Browser polyfill debug loading...');

// Add a debug log for message communication
const originalSendMessage = chrome.runtime.sendMessage;
chrome.runtime.sendMessage = function(extensionId, message, options, callback) {
    // Handle various call signatures
    if (typeof extensionId === 'object') {
        callback = options;
        options = message;
        message = extensionId;
        extensionId = undefined;
    }
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    
    console.log('Debug - sendMessage called with:', {
        extensionId,
        message,
        options
    });
    
    // Call the original function with proper arguments
    if (extensionId && typeof extensionId !== 'object') {
        return originalSendMessage.call(chrome.runtime, extensionId, message, options, function(response) {
            console.log('Debug - sendMessage response:', response);
            if (callback) callback(response);
        });
    } else {
        return originalSendMessage.call(chrome.runtime, message, options, function(response) {
            console.log('Debug - sendMessage response:', response);
            if (callback) callback(response);
        });
    }
};

console.log('Browser polyfill debug loaded and patched');
