/**
 * Modal for saving a Studio component to a content library.
 */
define(['jquery', 'underscore', 'gettext', 'js/views/modals/base_modal'],
function($, _, gettext, BaseModal) {
    'use strict';

    var SaveToLibraryModal = BaseModal.extend({
        events: _.extend({}, BaseModal.prototype.events, {
            'click .action-save:not(.is-disabled)': 'saveToLibrary',
            'click .save-to-library-card': 'onLibraryCardSelected',
            'input .save-to-library-search': 'onSearchChanged',
            'click .save-to-library-retry': 'retryLoadLibraries',
        }),

        options: $.extend({}, BaseModal.prototype.options, {
            modalName: 'save-to-library',
            modalSize: 'med',
            viewSpecificClasses: 'save-to-library-modal',
            showEditorModeButtons: false,
            addPrimaryActionButton: true,
            primaryActionButtonType: 'save',
            primaryActionButtonTitle: gettext('Guardar en biblioteca'),
            title: gettext('Guardar en biblioteca'),
            librariesUrl: '/api/libraries/v2/',
        }),

        initialize: function() {
            BaseModal.prototype.initialize.call(this);
            this.onSave = this.options.onSave;
            this.libraries = [];
            this.filteredLibraries = [];
            this.selectedLibraryId = null;
            this.isSaving = false;
        },

        show: function() {
            BaseModal.prototype.show.apply(this, arguments);
            this.disableActionButton('save');
            this.loadLibraries();
        },

        addActionButtons: function() {
            this.addActionButton('save', gettext('Guardar en biblioteca'), true);
            this.addActionButton('cancel', gettext('Cancelar'));
            this.disableActionButton('save');
        },

        getContentHtml: function() {
            return `
                <div class="save-to-library-content">
                    <div class="save-to-library-intro">
                        <p class="save-to-library-description">
                            ${_.escape(gettext('Selecciona la biblioteca donde quieres guardar este contenido.'))}
                        </p>
                    </div>
                    <div class="save-to-library-search-wrapper is-hidden">
                        <label class="save-to-library-search-label sr" for="save-to-library-search">
                            ${_.escape(gettext('Buscar biblioteca'))}
                        </label>
                        <input
                            id="save-to-library-search"
                            class="save-to-library-search"
                            type="search"
                            placeholder="${_.escape(gettext('Buscar biblioteca'))}"
                            autocomplete="off"
                        />
                    </div>
                    <div class="save-to-library-status" aria-live="polite">
                        <p class="save-to-library-loading">
                            ${_.escape(gettext('Cargando bibliotecas...'))}
                        </p>
                        <p class="save-to-library-error is-hidden"></p>
                        <p class="save-to-library-empty is-hidden">
                            ${_.escape(gettext('No hay bibliotecas disponibles.'))}
                        </p>
                        <p class="save-to-library-saving is-hidden">
                            ${_.escape(gettext('Guardando...'))}
                        </p>
                    </div>
                    <div class="save-to-library-results is-hidden">
                        <div class="save-to-library-card-list" role="listbox" aria-label="${_.escape(gettext('Bibliotecas disponibles'))}">
                        </div>
                    </div>
                </div>
            `;
        },

        retryLoadLibraries: function(event) {
            event.preventDefault();
            this.loadLibraries();
        },

        loadLibraries: function() {
            this.showLoadingState();
            $.getJSON(this.options.librariesUrl)
                .done((data) => {
                    this.libraries = Array.isArray(data) ? data : (data.results || []);
                    this.filteredLibraries = this.libraries.slice();
                    this.renderLibraries();
                })
                .fail(() => {
                    this.showErrorState(gettext('Error al cargar bibliotecas.'), true);
                });
        },

        renderLibraries: function() {
            const $searchWrapper = this.$('.save-to-library-search-wrapper');
            const $results = this.$('.save-to-library-results');
            const $cardList = this.$('.save-to-library-card-list');
            const $loading = this.$('.save-to-library-loading');
            const $error = this.$('.save-to-library-error');
            const $empty = this.$('.save-to-library-empty');

            $loading.addClass('is-hidden');
            $error.addClass('is-hidden').empty();
            $cardList.empty();

            if (!this.filteredLibraries.length) {
                $searchWrapper.toggleClass('is-hidden', !this.libraries.length);
                $results.addClass('is-hidden');
                $empty.removeClass('is-hidden');
                this.updateSaveButtonState();
                return;
            }

            this.filteredLibraries.forEach((library) => {
                const libraryId = library.id || library.library_key;
                const title = library.title || library.display_name || libraryId;
                const org = library.org || '';
                const slug = library.slug || '';
                const selectedClass = this.selectedLibraryId === libraryId ? ' is-selected' : '';
                const secondary = [org, slug].filter(Boolean).join(' / ');

                $cardList.append(`
                    <button
                        type="button"
                        class="save-to-library-card${selectedClass}"
                        data-library-id="${_.escape(libraryId)}"
                        role="option"
                        aria-selected="${this.selectedLibraryId === libraryId ? 'true' : 'false'}"
                    >
                        <span class="save-to-library-card-icon" aria-hidden="true">▦</span>
                        <span class="save-to-library-card-copy">
                            <span class="save-to-library-card-title">${_.escape(title)}</span>
                            <span class="save-to-library-card-meta">${_.escape(secondary || libraryId)}</span>
                        </span>
                    </button>
                `);
            });

            $empty.addClass('is-hidden');
            $searchWrapper.removeClass('is-hidden');
            $results.removeClass('is-hidden');
            this.updateSaveButtonState();
        },

        showLoadingState: function() {
            this.isSaving = false;
            this.selectedLibraryId = null;
            this.disableActionButton('save');
            this.$('.save-to-library-loading').removeClass('is-hidden');
            this.$('.save-to-library-saving').addClass('is-hidden');
            this.$('.save-to-library-error').addClass('is-hidden').empty();
            this.$('.save-to-library-empty').addClass('is-hidden');
            this.$('.save-to-library-search-wrapper').addClass('is-hidden');
            this.$('.save-to-library-results').addClass('is-hidden');
        },

        showSavingState: function() {
            this.isSaving = true;
            this.disableActionButton('save');
            this.disableActionButton('cancel');
            this.getActionButton('save').text(gettext('Guardando...'));
            this.$('.save-to-library-loading').addClass('is-hidden');
            this.$('.save-to-library-error').addClass('is-hidden').empty();
            this.$('.save-to-library-empty').addClass('is-hidden');
            this.$('.save-to-library-saving').removeClass('is-hidden');
            this.$('.save-to-library-search').prop('disabled', true);
            this.$('.save-to-library-card').prop('disabled', true);
        },

        resetSavingState: function() {
            this.isSaving = false;
            this.enableActionButton('cancel');
            this.getActionButton('save').text(gettext('Guardar en biblioteca'));
            this.$('.save-to-library-saving').addClass('is-hidden');
            this.$('.save-to-library-search').prop('disabled', false);
            this.$('.save-to-library-card').prop('disabled', false);
            this.updateSaveButtonState();
        },

        showErrorState: function(message, allowRetry) {
            const retryHtml = allowRetry
                ? ` <a href="#" class="save-to-library-retry">${_.escape(gettext('Reintentar'))}</a>`
                : '';
            this.isSaving = false;
            this.enableActionButton('cancel');
            this.$('.save-to-library-loading').addClass('is-hidden');
            this.$('.save-to-library-saving').addClass('is-hidden');
            this.$('.save-to-library-empty').addClass('is-hidden');
            this.$('.save-to-library-error')
                .removeClass('is-hidden')
                .html(`${_.escape(message)}${retryHtml}`);
            this.$('.save-to-library-search').prop('disabled', false);
            this.$('.save-to-library-card').prop('disabled', false);
            if (!this.filteredLibraries.length) {
                this.$('.save-to-library-results').addClass('is-hidden');
                this.$('.save-to-library-search-wrapper').addClass('is-hidden');
            }
            this.updateSaveButtonState();
        },

        updateSaveButtonState: function() {
            if (this.isSaving || !this.selectedLibraryId) {
                this.disableActionButton('save');
            } else {
                this.enableActionButton('save');
            }
        },

        onSearchChanged: function(event) {
            const query = $(event.currentTarget).val().trim().toLowerCase();
            this.filteredLibraries = this.libraries.filter((library) => {
                const title = library.title || library.display_name || '';
                const org = library.org || '';
                const slug = library.slug || '';
                const libraryId = library.id || library.library_key || '';
                return [title, org, slug, libraryId].some((value) => value.toLowerCase().includes(query));
            });
            if (this.selectedLibraryId && !this.filteredLibraries.some((library) => (library.id || library.library_key) === this.selectedLibraryId)) {
                this.selectedLibraryId = null;
            }
            this.renderLibraries();
        },

        onLibraryCardSelected: function(event) {
            const libraryId = $(event.currentTarget).data('libraryId');
            if (this.isSaving) {
                return;
            }
            this.selectedLibraryId = libraryId;
            this.renderLibraries();
        },

        saveToLibrary: function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (!this.selectedLibraryId || this.isSaving) {
                this.updateSaveButtonState();
                return;
            }
            this.showSavingState();
            $.when(this.onSave(this.selectedLibraryId))
                .done(() => {
                    this.hide();
                })
                .fail((message) => {
                    this.resetSavingState();
                    this.showErrorState(message || gettext('Error al cargar bibliotecas.'), false);
                });
        },
    });

    return SaveToLibraryModal;
});
