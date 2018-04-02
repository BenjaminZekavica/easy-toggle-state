import ATTR from './constants';

// Retrieve all targets of a trigger element
const retrieveTargets = element => {
	if(element.hasAttribute(ATTR.TARGET_ALL))
		return document.querySelectorAll(element.getAttribute(ATTR.TARGET_ALL));
	else if(element.hasAttribute(ATTR.TARGET_PARENT))
		return element.parentElement.querySelectorAll(element.getAttribute(ATTR.TARGET_PARENT));
	else if(element.hasAttribute(ATTR.TARGET_SELF))
		return element.querySelectorAll(element.getAttribute(ATTR.TARGET_SELF));
	return [];
}

// Retrieve all active trigger of a group
const retrieveGroupState = group => {
	let activeGroupElements = [];
	[...document.querySelectorAll('['+ATTR.CLASS+']['+ATTR.GROUP+'="'+group+'"]')].forEach((groupElement) => {
		if(groupElement.isToggleActive) activeGroupElements.push(groupElement);
	});
	return activeGroupElements;
}

// Toggle off all 'toggle-outside' elements when reproducing specified or click event outside trigger or target elements
const documentEventHandler = event => {
	let target = event.target;

	if (!target.closest('['+ATTR.TARGET_STATE+'="true"]')) {
		[...document.querySelectorAll('['+ATTR.CLASS+']['+ATTR.OUTSIDE+']')].forEach((element) => {
			if(element != target && element.isToggleActive)
				if(element.hasAttribute(ATTR.GROUP)) manageGroup(element);
				else manageToggle(element);
		});
		if(target.hasAttribute(ATTR.OUTSIDE) && target.isToggleActive)
			document.addEventListener(target.getAttribute(ATTR.EVENT) || 'click', documentEventHandler, false);
	}
}

// Manage click on 'trigger-off' elements
const triggerOffHandler = event => {
	manageToggle(event.target.targetElement);
}

// Manage event ouside trigger or target elements
const manageTriggerOutside = element => {
	if(element.hasAttribute(ATTR.OUTSIDE)) {
		if(element.hasAttribute(ATTR.GROUP))
			console.warn("You can't use '"+ATTR.OUTSIDE+"' on a grouped trigger");
		else {
			if(element.isToggleActive)
				document.addEventListener(element.getAttribute(ATTR.EVENT) || 'click', documentEventHandler, false);
			else
				document.removeEventListener(element.getAttribute(ATTR.EVENT) || 'click', documentEventHandler, false);
		}
	}
}

// Manage attributes and events of target elements
const manageTarget = (targetElement, triggerElement) => {
	if(triggerElement.hasAttribute(ATTR.OUTSIDE))
		targetElement.setAttribute(ATTR.TARGET_STATE, triggerElement.isToggleActive);

	let triggerOffList = targetElement.querySelectorAll('['+ATTR.TRIGGER_OFF+']');
	if(triggerOffList.length > 0) {
		if(triggerElement.isToggleActive) {
			triggerOffList.forEach(triggerOff => {
				triggerOff.targetElement = triggerElement;
				triggerOff.addEventListener('click', triggerOffHandler, false);
			});
		}else{
			triggerOffList.forEach(triggerOff => {
				triggerOff.removeEventListener('click', triggerOffHandler, false);
			});
		}
	}
}

// Toggle elements of a same group
const manageGroup = element => {
	let activeGroupElements = retrieveGroupState(element.getAttribute(ATTR.GROUP));

	if(activeGroupElements.length > 0){
		if(activeGroupElements.indexOf(element) === -1) {
			activeGroupElements.forEach(groupElement => {
				manageToggle(groupElement);
			});
			manageToggle(element);
		}
	}else{
		manageToggle(element);
	}
}

// Toggle class and aria on trigger and target elements
const manageToggle = element => {
	let className = element.getAttribute(ATTR.CLASS);
	element.isToggleActive = !element.isToggleActive;
	//console.log("toggle to "+element.isToggleActive);

	if(!element.hasAttribute(ATTR.TARGET_ONLY))
		element.classList.toggle(className);

	if(element.hasAttribute(ARIA.EXPANDED))
		element.setAttribute(ARIA.EXPANDED, element.isToggleActive);

	if(element.hasAttribute(ARIA.SELECTED))
		element.setAttribute(ARIA.SELECTED, element.isToggleActive);

	let targetElements = retrieveTargets(element);
	for(var i=0;i<targetElements.length;i++) {
		targetElements[i].classList.toggle(className);
		manageTarget(targetElements[i], element);
	}

	manageTriggerOutside(element);
}

const manageActiveByDefault = element => {
	element.isToggleActive = true;
	let className = element.getAttribute(ATTR.CLASS);

	if(!element.hasAttribute(ATTR.TARGET_ONLY) && !element.classList.contains(className))
		element.classList.add(className);

	if(element.hasAttribute(ARIA.EXPANDED) && element.getAttribute(ARIA.EXPANDED))
		element.setAttribute(ARIA.EXPANDED, true);

	if(element.hasAttribute(ARIA.SELECTED) && !element.getAttribute(ARIA.SELECTED))
		element.setAttribute(ARIA.SELECTED, true);

	let targetElements = retrieveTargets(element);
	for(var i=0;i<targetElements.length;i++) {
		if(!targetElements[i].classList.contains(element.getAttribute(ATTR.CLASS)))
			targetElements[i].classList.add(className);
		manageTarget(targetElements[i], element);
	}

	manageTriggerOutside(element);
}

// Initialization
const init = () => {

	// Active by default management
	[...document.querySelectorAll('['+ATTR.CLASS+']['+ATTR.IS_ACTIVE+']')].forEach((trigger) => {
		if(trigger.hasAttribute(ATTR.GROUP)) {
			let group = trigger.getAttribute(ATTR.GROUP);
			if(retrieveGroupState(group).length > 0)
				console.warn("Toggle group '"+group+"' must not have more than one trigger with '"+ATTR.IS_ACTIVE+"'");
			else
				manageActiveByDefault(trigger);
		} else {
			manageActiveByDefault(trigger);
		}
	});

	// Set specified or click event on each trigger element
	[...document.querySelectorAll('['+ATTR.CLASS+']')].forEach((trigger) => {
		trigger.addEventListener(trigger.getAttribute(ATTR.EVENT) || 'click', (event) => {
			event.preventDefault();
			if(trigger.hasAttribute(ATTR.GROUP)) manageGroup(trigger);
			else manageToggle(trigger);
		}, false);
	});

	// Escape key management
	let triggerEscElements = [...document.querySelectorAll('['+ATTR.CLASS+']['+ATTR.ESCAPE+']')];
	if(triggerEscElements.length > 0) {
		document.addEventListener('keyup', (event) => {
			event = event || window.event;
			let isEscape = false;

			if('key' in event)
				isEscape = (event.key === 'Escape' || event.key === 'Esc');
			else
				isEscape = (event.keyCode === 27);

			if(isEscape) {
				triggerEscElements.forEach((trigger) => {
					if(trigger.isToggleActive) {
						if(trigger.hasAttribute(ATTR.GROUP))
							console.warn("You can't use '"+ATTR.ESCAPE+"' on a grouped trigger");
						else manageToggle(trigger);
					}
				});
			}
		}, false);
	}
}

const onLoad = () => {
	init();
	document.removeEventListener('DOMContentLoaded', onLoad);
}

document.addEventListener('DOMContentLoaded', onLoad);
window.initEasyToggleState = init;
