import {
	CHECKED,
	CLASS,
	ESCAPE,
	EVENT,
	EXPANDED,
	GROUP,
	HIDDEN,
	IS_ACTIVE,
	OUTSIDE,
	RADIO_GROUP,
	SELECTED,
	TARGET_ONLY,
	TARGET_STATE,
	TRIGGER_OFF
} from "../constants/constants";
import $$ from "../helpers/retrieve-query-selector-all";
import manageAria from "../helpers/manage-aria";
import retrieveGroupActiveElement from "../helpers/retrieve-group-active-element";
import retrieveTargets from "../helpers/retrieve-targets";

/**
 * Toggle off all elements width 'data-toggle-outside' attribute
 * when reproducing specified or click event outside itself or its targets.
 * @param {event} event - Event triggered on document
 * @returns {undefined}
 */
const documentEventHandler = event => {
	const target = event.target;

	if (target.closest("[" + TARGET_STATE + '="true"]')) {
		return;
	}

	$$(OUTSIDE).forEach(element => {
		if (element !== target && element.isToggleActive) {
			(element.hasAttribute(GROUP) || element.hasAttribute(RADIO_GROUP) ? manageGroup : manageToggle)(element);
		}
	});

	if (target.hasAttribute(OUTSIDE) && target.isToggleActive) {
		document.addEventListener(target.getAttribute(EVENT) || "click", documentEventHandler, false);
	}
};

/**
 * Manage click on elements with 'data-trigger-off' attribue.
 * @param {event} event - Event triggered on element with 'trigger-off' attribute
 * @returns {undefined}
 */
const triggerOffHandler = event => manageToggle(event.target.targetElement);

/**
 * Manage attributes and events of target elements.
 * @param {node} targetElement - An element targeted by the trigger element
 * @param {node} triggerElement - The trigger element
 * @returns {undefined}
 */
const manageTarget = (targetElement, triggerElement) => {
	targetElement.isToggleActive = !targetElement.isToggleActive;
	manageAria(targetElement);

	if (triggerElement.hasAttribute(OUTSIDE)) {
		targetElement.setAttribute(TARGET_STATE, triggerElement.isToggleActive);
	}

	const triggerOffList = $$(TRIGGER_OFF, targetElement);

	if (triggerOffList.length === 0) {
		return;
	}

	if (triggerElement.isToggleActive) {
		return triggerOffList.forEach(triggerOff => {
			triggerOff.targetElement = triggerElement;
			triggerOff.addEventListener("click", triggerOffHandler, false);
		});
	}

	return triggerOffList.forEach(triggerOff => {
		triggerOff.removeEventListener("click", triggerOffHandler, false);
	});
};

/**
 * Toggle class and aria on trigger and target elements.
 * @param {node} element - The element to toggle state and attributes
 * @returns {undefined}
 */
const manageToggle = element => {
	const className = element.getAttribute(CLASS) || "is-active";
	element.isToggleActive = !element.isToggleActive;
	manageAria(element);

	if (!element.hasAttribute(TARGET_ONLY)) {
		element.classList.toggle(className);
	}

	const targetElements = retrieveTargets(element);
	for (let i = 0; i < targetElements.length; i++) {
		targetElements[i].classList.toggle(className);
		manageTarget(targetElements[i], element);
	}

	return manageTriggerOutside(element);
};

/**
 * Manage event ouside trigger or target elements.
 * @param {node} element - The element to toggle when 'click' or custom event is triggered on document
 * @returns {undefined}
 */
const manageTriggerOutside = element => {
	if (!element.hasAttribute(OUTSIDE)) {
		return;
	}

	if (element.hasAttribute(RADIO_GROUP)) {
		return console.warn(`You can't use '${OUTSIDE}' on a radio grouped trigger`);
	}

	if (element.isToggleActive) {
		return document.addEventListener(element.getAttribute(EVENT) || "click", documentEventHandler, false);
	}

	return document.removeEventListener(element.getAttribute(EVENT) || "click", documentEventHandler, false);
};

/**
 * Toggle elements of a same group.
 * @param {node} element - The element to test if it's in a group
 * @returns {undefined}
 */
const manageGroup = element => {
	const groupActiveElements = retrieveGroupActiveElement(element);
	if (groupActiveElements.length === 0) {
		return manageToggle(element);
	}

	if (groupActiveElements.indexOf(element) === -1) {
		groupActiveElements.forEach(manageToggle);
		return manageToggle(element);
	}

	if (groupActiveElements.indexOf(element) !== -1 && !element.hasAttribute(RADIO_GROUP)) {
		return manageToggle(element);
	}
};

/**
 * Toggle elements set to be active by default.
 * @param {node} element - The element to activate on page load
 * @returns {undefined}
 */
const manageActiveByDefault = element => {
	const className = element.getAttribute(CLASS) || "is-active";
	element.isToggleActive = true;
	manageAria(element, {
		[CHECKED]: true,
		[EXPANDED]: true,
		[HIDDEN]: false,
		[SELECTED]: true
	});

	if (!element.hasAttribute(TARGET_ONLY) && !element.classList.contains(className)) {
		element.classList.add(className);
	}

	const targetElements = retrieveTargets(element);
	for (let i = 0; i < targetElements.length; i++) {
		if (!targetElements[i].classList.contains(className)) {
			targetElements[i].classList.add(className);
		}
		manageTarget(targetElements[i], element);
	}

	return manageTriggerOutside(element);
};

/**
 * Initialization.
 * @returns {undefined}
 */
export default () => {

	/** Test if there's some trigger */
	if ($$().length === 0) {
		return console.warn(`Easy Toggle State is not used: there's no trigger with '${CLASS}' attribute to initialize.`);
	}

	/** Active by default management. */
	$$(IS_ACTIVE).forEach(trigger => {
		if (!trigger.hasAttribute(GROUP) && !trigger.hasAttribute(RADIO_GROUP)) {
			return manageActiveByDefault(trigger);
		}

		if (retrieveGroupActiveElement(trigger).length > 0) {
			return console.warn(`Toggle group '${trigger.getAttribute(GROUP) ||
					trigger.getAttribute(RADIO_GROUP)}' must not have more than one trigger with '${IS_ACTIVE}'`);
		}

		return manageActiveByDefault(trigger);
	});

	/** Set specified or click event on each trigger element. */
	$$().forEach(trigger => {
		trigger.addEventListener(
			trigger.getAttribute(EVENT) || "click",
			event => {
				event.preventDefault();
				(trigger.hasAttribute(GROUP) || trigger.hasAttribute(RADIO_GROUP) ? manageGroup : manageToggle)(trigger);
			},
			false
		);
	});

	/** Escape key management. */
	const triggerEscElements = $$(ESCAPE);
	if (triggerEscElements.length > 0) {
		document.addEventListener(
			"keyup",
			event => {
				if (!(event.key === "Escape") && !(event.key === "Esc")) {
					return;
				}
				triggerEscElements.forEach(trigger => {
					if (!trigger.isToggleActive) {
						return;
					}

					if (trigger.hasAttribute(RADIO_GROUP)) {
						return console.warn(`You can't use '${ESCAPE}' on a radio grouped trigger`);
					}

					return (trigger.hasAttribute(GROUP) ? manageGroup : manageToggle)(trigger);
				});
			},
			false
		);
	}
};
