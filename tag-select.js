class TagSelect {
	constructor(selectElement, options = {}) {
		// Default options
		this.defaults = {
			placeholder: "Type to search or add new tags...",
			allowNew: true,
			maxTags: null,
			minTags: 0,
			createPrompt: 'Create "{tag}"',
			noResultsText: "No options available",
			containerClass: "tag-select-container",
			inputClass: "tag-input",
			dropdownClass: "tag-dropdown",
			tagClass: "tag-item",
			removeClass: "tag-remove",
			highlightedClass: "highlighted",
			dropdownItemClass: "dropdown-item",
			autoInitialize: true
		};

		// Merge provided options with defaults
		this.options = { ...this.defaults, ...options };

		// Store reference to original select
		this.originalSelect = selectElement;

		if (!(this.originalSelect instanceof HTMLSelectElement)) {
			throw new Error("TagSelect requires a select element");
		}

		if (!this.originalSelect.multiple) {
			throw new Error(
				"TagSelect requires a select element with the multiple attribute"
			);
		}

		// Initialize DOM elements
		this.container = null;
		this.input = null;
		this.dropdown = null;
		this.highlightedIndex = -1;

		// Initialize if auto-initialize is enabled
		if (this.options.autoInitialize) {
			this.initialize();
		}
	}

	initialize() {
		this.createElements();
		this.setupEventListeners();
		this.addExistingTags();
		return this;
	}

	createElements() {
		// Create container
		this.container = document.createElement("div");
		this.container.className = this.options.containerClass;

		// Create input
		this.input = document.createElement("input");
		this.input.className = this.options.inputClass;
		this.input.placeholder = this.options.placeholder;

		// Create dropdown
		this.dropdown = document.createElement("div");
		this.dropdown.className = this.options.dropdownClass;

		// Insert elements
		this.originalSelect.parentNode.insertBefore(
			this.container,
			this.originalSelect
		);
		this.container.appendChild(this.input);
		this.container.appendChild(this.dropdown);

		// Hide original select but keep in DOM for form submission
		this.originalSelect.classList.add("original-select");
	}

	addExistingTags() {
		const selectedOptions = Array.from(this.originalSelect.selectedOptions);
		selectedOptions.forEach((option) => {
			this.addTag(option.value, option.textContent);
		});
	}

	setupEventListeners() {
		// Focus input when clicking container
		this.container.addEventListener("click", (e) => {
			if (e.target === this.container) {
				this.input.focus();
			}
		});

		// Show dropdown on input focus
		this.input.addEventListener("focus", () => {
			this.dropdown.classList.add("show");
			this.populateDropdown(this.input.value);
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!this.container.contains(e.target) && !e.target.classList.contains("dropdown-item")) {
				this.dropdown.classList.remove("show");
			}
		});

		// Filter options on input
		this.input.addEventListener("input", () => {
			this.populateDropdown(this.input.value);
		});

		// Keyboard navigation
		this.input.addEventListener("keydown", this.handleKeyDown.bind(this));
	}

	handleKeyDown(e) {
		const items = this.dropdown.querySelectorAll(
			`.${this.options.dropdownItemClass}`
		);

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				this.highlightedIndex = Math.min(
					this.highlightedIndex + 1,
					items.length - 1
				);
				this.updateHighlight(items);
				if (items[this.highlightedIndex]) {
					this.ensureVisible(items[this.highlightedIndex]);
				}
				break;

			case "ArrowUp":
				e.preventDefault();
				this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
				this.updateHighlight(items);
				if (items[this.highlightedIndex]) {
					this.ensureVisible(items[this.highlightedIndex]);
				}
				break;

			case "Enter":
				e.preventDefault();
				if (this.highlightedIndex >= 0 && items[this.highlightedIndex]) {
					const value = items[this.highlightedIndex].dataset.value;
					let text;

					// Check if this is a "Create [tag]" item
					if (items[this.highlightedIndex].dataset.isNew === "true") {
						text = this.input.value.trim();
					} else {
						text = items[this.highlightedIndex].textContent;
					}

					this.addTag(value, text);
					this.input.value = "";
					this.populateDropdown("");
					this.highlightedIndex = -1;
				} else if (this.input.value.trim() !== "" && this.options.allowNew) {
					const newValue = this.input.value
						.trim()
						.toLowerCase()
						.replace(/\s+/g, "-");
					this.addTag(newValue, this.input.value.trim());
					this.input.value = "";
					this.populateDropdown("");
				}
				break;

			case "Escape":
				this.dropdown.classList.remove("show");
				break;

			case "Backspace":
				if (this.input.value === "") {
					const tags = this.container.querySelectorAll(`.${this.options.tagClass}`);
					if (tags.length > 0) {
						const lastTag = tags[tags.length - 1];
						const value = lastTag.dataset.value;
						this.removeTag(lastTag, value);
					}
				}
				break;
		}
	}

	populateDropdown(filterText) {
		this.dropdown.innerHTML = "";
		this.highlightedIndex = -1;

		const currentValues = this.getCurrentValues();
		const options = Array.from(this.originalSelect.options);

		// Check if we're at max tags
		if (
			this.options.maxTags !== null &&
			currentValues.length >= this.options.maxTags
		) {
			const maxReached = document.createElement("div");
			maxReached.className = this.options.dropdownItemClass;
			maxReached.textContent = `Maximum ${this.options.maxTags} tags reached`;
			maxReached.style.fontStyle = "italic";
			maxReached.style.cursor = "default";
			this.dropdown.appendChild(maxReached);
			return;
		}

		const filtered = options.filter((option) => {
			const isAlreadySelected = currentValues.includes(option.value);
			const matchesFilter = option.textContent
				.toLowerCase()
				.includes(filterText.toLowerCase());
			return matchesFilter && !isAlreadySelected;
		});

		if (filtered.length === 0) {
			if (filterText.trim() !== "" && this.options.allowNew) {
				// Create new tag option
				const newItem = document.createElement("div");
				newItem.className = this.options.dropdownItemClass;
				newItem.textContent = this.options.createPrompt.replace(
					"{tag}",
					filterText
				);
				newItem.dataset.value = filterText.toLowerCase().replace(/\s+/g, "-");
				newItem.dataset.isNew = "true";

				newItem.addEventListener("click", () => {
					this.addTag(newItem.dataset.value, filterText);
					this.input.value = "";
					this.input.focus();
					this.populateDropdown("");
				});

				this.dropdown.appendChild(newItem);
			} else {
				// No results
				const noResults = document.createElement("div");
				noResults.className = this.options.dropdownItemClass;
				noResults.textContent = this.options.noResultsText;
				noResults.style.fontStyle = "italic";
				noResults.style.cursor = "default";
				this.dropdown.appendChild(noResults);
			}
		} else {
			// Add filtered options
			filtered.forEach((option) => {
				const item = document.createElement("div");
				item.className = this.options.dropdownItemClass;
				item.textContent = option.textContent;
				item.dataset.value = option.value;

				item.addEventListener("click", () => {
					this.addTag(item.dataset.value, item.textContent);
					this.input.value = "";
					this.input.focus();
					this.populateDropdown("");
				});

				this.dropdown.appendChild(item);
			});
		}
	}

	getCurrentValues() {
		return Array.from(this.originalSelect.selectedOptions).map(
			(option) => option.value
		);
	}

	addTag(value, text) {
		// Check tag limits
		const currentTags = this.container.querySelectorAll(
			`.${this.options.tagClass}`
		);
		if (
			this.options.maxTags !== null &&
			currentTags.length >= this.options.maxTags
		) {
			return false;
		}

		// Check if tag already exists
		for (let i = 0; i < currentTags.length; i++) {
			if (currentTags[i].dataset.value === value) {
				return false; // Tag already exists
			}
		}

		// Create tag element
		const tag = document.createElement("div");
		tag.className = this.options.tagClass;
		tag.dataset.value = value;
		tag.textContent = text;

		// Create remove button
		const removeBtn = document.createElement("span");
		removeBtn.className = this.options.removeClass;
		removeBtn.innerHTML = "&times;";
		removeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.removeTag(tag, value);
		});

		// Add remove button to tag
		tag.appendChild(removeBtn);

		// Insert tag before input
		this.container.insertBefore(tag, this.input);

		// Update original select
		this.updateOriginalSelect(value, true);

		// Trigger change event
		this.triggerChange();

		return true;
	}

	removeTag(tagElement, value) {
		// Check if we're at min tags
		const currentTags = this.container.querySelectorAll(
			`.${this.options.tagClass}`
		);
		if (currentTags.length <= this.options.minTags) {
			return false;
		}

		this.container.removeChild(tagElement);
		this.updateOriginalSelect(value, false);

		// Trigger change event
		this.triggerChange();

		return true;
	}

	updateOriginalSelect(value, isSelected) {
		// Find option if it exists
		let option = Array.from(this.originalSelect.options).find(
			(opt) => opt.value === value
		);

		if (!option && isSelected) {
			// Create new option
			option = document.createElement("option");
			option.value = value;
			option.textContent = value;
			this.originalSelect.appendChild(option);
		}

		if (option) {
			option.selected = isSelected;
		}
	}

	triggerChange() {
		// Dispatch change event on original select
		const event = new Event("change", { bubbles: true });
		this.originalSelect.dispatchEvent(event);

		// If a custom onChange callback is provided, call it
		if (typeof this.options.onChange === "function") {
			const selectedValues = this.getCurrentValues();
			this.options.onChange(selectedValues, this.originalSelect);
		}
	}

	updateHighlight(items) {
		items.forEach((item) => item.classList.remove(this.options.highlightedClass));
		if (this.highlightedIndex >= 0 && this.highlightedIndex < items.length) {
			items[this.highlightedIndex].classList.add(this.options.highlightedClass);
		}
	}

	ensureVisible(element) {
		const containerRect = this.dropdown.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();

		if (elementRect.bottom > containerRect.bottom) {
			this.dropdown.scrollTop =
				element.offsetTop + element.offsetHeight - this.dropdown.offsetHeight;
		} else if (elementRect.top < containerRect.top) {
			this.dropdown.scrollTop = element.offsetTop;
		}
	}

	// Public methods

	/**
	 * Get the current selected values
	 * @returns {Array} Array of currently selected values
	 */
	getValues() {
		return this.getCurrentValues();
	}

	/**
	 * Programmatically add a new tag
	 * @param {string} value - The tag value
	 * @param {string} text - The tag display text (defaults to value if not provided)
	 * @returns {boolean} Whether the tag was successfully added
	 */
	add(value, text = value) {
		return this.addTag(value, text);
	}

	/**
	 * Programmatically remove a tag by its value
	 * @param {string} value - The value of the tag to remove
	 * @returns {boolean} Whether the tag was successfully removed
	 */
	remove(value) {
		const tagElement = Array.from(
			this.container.querySelectorAll(`.${this.options.tagClass}`)
		).find((tag) => tag.dataset.value === value);

		if (tagElement) {
			return this.removeTag(tagElement, value);
		}
		return false;
	}

	/**
	 * Remove all tags
	 * @returns {number} Number of tags removed
	 */
	clear() {
		const tags = this.container.querySelectorAll(`.${this.options.tagClass}`);
		let removed = 0;

		tags.forEach((tag) => {
			const value = tag.dataset.value;
			if (this.removeTag(tag, value)) {
				removed++;
			}
		});

		return removed;
	}

	/**
	 * Destroy the TagSelect instance and restore the original select
	 */
	destroy() {
		// Remove the container
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		// Show the original select
		this.originalSelect.classList.remove("original-select");

		// Clean up any event listeners
		// Note: This won't clean up all event listeners, but the major ones
		document.removeEventListener("click", this.handleDocumentClick);
	}

	/**
	 * Refresh the TagSelect instance (e.g., after options have changed)
	 */
	refresh() {
		// Clear existing tags
		const tags = this.container.querySelectorAll(`.${this.options.tagClass}`);
		tags.forEach((tag) => {
			this.container.removeChild(tag);
		});

		// Add tags from the current select
		this.addExistingTags();

		// Repopulate dropdown
		this.populateDropdown(this.input.value);
	}
}

// Static initialization method
TagSelect.init = function (selector, options = {}) {
	const elements = document.querySelectorAll(selector);
	return Array.from(elements).map((el) => new TagSelect(el, options));
};

// Auto-initialization
document.addEventListener("DOMContentLoaded", function () {
	if (window.autoInitTagSelect !== false) {
		TagSelect.init("select[multiple]");
	}
});
