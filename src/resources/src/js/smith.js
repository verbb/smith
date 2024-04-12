// ==========================================================================

// Smith Plugin for Craft CMS
// Author: Verbb - https://verbb.io/

// ==========================================================================

if (typeof Craft.Smith === typeof undefined) {
    Craft.Smith = {};
}

(function($) {

Craft.Smith.Init = Garnish.Base.extend({
    smithMenus: [],

    init: function(options) {
        this.initSmith();

        // Initialize again when opening an element slideout
        Garnish.on(Craft.CpScreenSlideout, 'load', this.initSmith.bind(this));
    },

    initSmith: function() {
        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixFields = Garnish.$doc.find('.matrix-field');

            for (var i = 0; i < $matrixFields.length; i++) {
                var $matrixField = $($matrixFields[i]);
                var $matrixBlocks = $matrixField.find('> .blocks > .matrixblock');

                for (var j = 0; j < $matrixBlocks.length; j++) {
                    var $matrixBlock = $($matrixBlocks[j]);
                    var $settingsBtn = $matrixBlock.find('.actions .settings.menubtn');

                    // Don't do this for static blocks
                    if ($matrixBlock.hasClass('static')) {
                        continue;
                    }

                    // Create a new class for this specific Matrix field and block
                    this.smithMenus.push(new Craft.Smith.Menu($matrixField, $matrixBlock, $matrixBlocks));
                }
            }

            // Create a callback for new blocks
            Garnish.on(Craft.MatrixInput, 'blockAdded', $.proxy(this, 'blockAdded'));

            // Allow for Super Table's nested Matrix JS
            if (Craft.SuperTable && Craft.SuperTable.MatrixInputAlt) {
                Garnish.on(Craft.SuperTable.MatrixInputAlt, 'blockAdded', $.proxy(this, 'blockAdded'));
            }
        }, this));
    },

    blockAdded: function(e) {
        Garnish.requestAnimationFrame($.proxy(function() {
            var $matrixField = e.target.$container;
            var $matrixBlocks = $matrixField.find('> .blocks > .matrixblock');
            var $matrixBlock = $(e.$block);

            var blockInstance = $matrixBlock.data('block');

            // Try again if the menu button isn't initialised yet
            if (!blockInstance) {
                this.blockAdded(e);
                return;
            }

            // Update all Smith menus' with the correct matrix blocks
            $.each(this.smithMenus, function(index, menu) {
                menu.$matrixBlocks = $matrixBlocks;
            });

            // Don't do this for static blocks
            if ($matrixBlock.hasClass('static')) {
                return;
            }

            // Create a new Smith menu class for the new block
            setTimeout(() => {
                this.smithMenus.push(new Craft.Smith.Menu($matrixField, $matrixBlock, $matrixBlocks));
            }, 200);
        }, this));
    },
});

Craft.Smith.Menu = Garnish.Base.extend({
    init: function($matrixField, $matrixBlock, $matrixBlocks) {
        this.$matrixField = $matrixField;
        this.$matrixBlock = $matrixBlock;
        this.$matrixBlocks = $matrixBlocks;

        if (this.$matrixBlock.data('renderedSmith')) {
            return;
        }

        this.blockInstance = this.$matrixBlock.data('entry');

        // Keep track of the delete option - we want to insert before that
        var $deleteOption = this.blockInstance.$actionMenu.find('[data-action="delete"]').parents('ul');

        // Create our buttons
        this.$copyBtn = $('<a data-icon="copy" data-action="copy">' + Craft.t('app', 'Copy') + '</a>');
        this.$pasteBtn = $('<a data-icon="paste" data-action="paste">' + Craft.t('app', 'Paste') + '</a>');
        this.$cloneBtn = $('<a data-icon="clone" data-action="clone">' + Craft.t('app', 'Clone') + '</a>');

        // Add new menu items to the DOM
        const $ul = $('<ul/>');
        this.$copyBtn.appendTo($ul).wrap('<li/>');
        this.$pasteBtn.appendTo($ul).wrap('<li/>');
        this.$cloneBtn.appendTo($ul).wrap('<li/>');
        $ul.insertBefore($deleteOption);
        $('<hr class="padded">').insertBefore($deleteOption);

        this.addListener(this.$copyBtn, 'click', this.handleClick);
        this.addListener(this.$pasteBtn, 'click', this.handleClick);
        this.addListener(this.$cloneBtn, 'click', this.handleClick);

        // Perform some checks
        this.checkPaste();

        // Prevent double-binding
        this.$matrixBlock.data('renderedSmith', true);
    },

    handleClick: function(e) {
        var $option = $(e.target);

        if ($option.hasClass('disabled') || $option.hasClass('sel')) {
            return;
        }

        if ($option.data('action') == 'copy') {
            this.copyBlock(e);
        }

        if ($option.data('action') == 'paste') {
            this.pasteBlock(e);
        }

        if ($option.data('action') == 'clone') {
            this.cloneBlock(e);
        }

        this.blockInstance.actionDisclosure.hide();
    },


    checkPaste: function() {
        var canPaste = false;

        try {
            var data = JSON.parse(localStorage.getItem('smith:block'));
            var fieldHandle = this.$matrixField.attr('id');

            // Find copy data for this field
            if (data && fieldHandle.includes('fields-' + data.field)) {
                canPaste = true;
            }
        } catch(e) { }

        if (!canPaste) {
            this.$pasteBtn.disable();
        } else {
            this.$pasteBtn.enable();
        }
    },

    copyBlock: function(e) {
        var data = this._serializeBlocks();

        localStorage.setItem('smith:block', JSON.stringify(data));

        var count = data.blocks.length;
        var message = count == 1 ? '1 block copied' : '{n} blocks copied';

        Craft.cp.displayNotice(Craft.t('app', message, { n: count }));

        this.checkPaste();
    },

    pasteBlock: function(e, data) {
        try {
            if (!data) {
                var data = JSON.parse(localStorage.getItem('smith:block'));
            }

            var $blockContainer = this.$matrixField.find('.blocks');
            var $spinner = $('<div class="spinner smith-spinner"></div>').insertAfter(this.$matrixBlock);

            // Get the Matrix field JS instance
            var matrixField = this.$matrixField.data('matrix');

            // Figure out the next block, to instruct Matrix to insert before that one
            var $insertBefore = $spinner;

            // Fetch the blocks, rendered with values
            Craft.sendActionRequest('POST', 'smith/field/render-matrix-blocks', { data })
                .then((response) => {
                    for (var i = 0; i < response.data.blocks.length; i++) {
                        var data = response.data.blocks[i];

                        const $entry = $(data.blockHtml);

                        $entry.insertBefore($insertBefore);

                        matrixField.trigger('entryAdded', {
                            $entry: $entry,
                        });

                        Craft.initUiElements($entry.children('.fields'));
                        Craft.appendHeadHtml(data.headHtml);
                        Craft.appendBodyHtml(data.bodyHtml);

                        new Entry(matrixField, $entry);

                        matrixField.entrySort.addItems($entry);
                        matrixField.entrySelect.addItems($entry);
                        matrixField.updateAddEntryBtn();
                    }
                })
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    $spinner.remove();
                });
        } catch(e) { }
    },

    cloneBlock: function(e) {
        var data = this._serializeBlocks();

        this.pasteBlock(e, data);
    },

    _serializeBlocks: function() {
        var data = {
            blocks: []
        };

        var matrixField = this.$matrixField.data('matrix');
        var $selectedItems = matrixField.entrySelect.$selectedItems;

        if (!$selectedItems.length) {
            $selectedItems = this.$matrixBlock;
        }

        for (var i = 0; i < $selectedItems.length; i++) {
            var $blockItem = $($selectedItems[i]);

            data.blocks.push({
                id: $blockItem.data('id'),
                uid: $blockItem.data('uid'),
                fieldId: matrixField.settings.fieldId,
                entryTypeId: $blockItem.data('type-id'),
                ownerId: matrixField.settings.ownerId,
                ownerElementType: matrixField.settings.ownerElementType,
                siteId: matrixField.settings.siteId,
                namespace: matrixField.settings.namespace,
            });
        }

        return data;
    },
});





  const Entry = Garnish.Base.extend({
    /**
     * @type {Craft.MatrixInput}
     */
    matrix: null,
    $container: null,
    $titlebar: null,
    $tabContainer: null,
    $fieldsContainer: null,
    $previewContainer: null,
    $actionMenu: null,
    $collapsedInput: null,

    tabManager: null,
    actionDisclosure: null,
    formObserver: null,
    visibleLayoutElements: null,
    cancelToken: null,
    ignoreFailedRequest: false,

    isNew: null,
    id: null,

    collapsed: false,

    init: function (matrix, $container) {
      this.matrix = matrix;
      this.$container = $container;
      this.$titlebar = $container.children('.titlebar');
      this.$tabContainer = this.$titlebar.children('.matrixblock-tabs');
      this.$previewContainer = this.$titlebar.children('.preview');
      this.$fieldsContainer = $container.children('.fields');

      this.$container.data('entry', this);

      this.id = this.$container.data('id');
      this.isNew =
        !this.id ||
        (typeof this.id === 'string' && this.id.substring(0, 3) === 'new');

      if (this.$tabContainer.length) {
        this.tabManager = Craft.MatrixInput.initTabs(this.$tabContainer);
      }

      const $actionMenuBtn = this.$container.find('> .actions .action-btn');
      const actionDisclosure =
        $actionMenuBtn.data('trigger') ||
        new Garnish.DisclosureMenu($actionMenuBtn);

      this.$actionMenu = actionDisclosure.$container;
      this.actionDisclosure = actionDisclosure;

      actionDisclosure.on('show', () => {
        this.$container.addClass('active');
        if (this.$container.prev('.matrixblock').length) {
          this.$actionMenu
            .find('button[data-action=moveUp]:first')
            .parent()
            .removeClass('hidden');
        } else {
          this.$actionMenu
            .find('button[data-action=moveUp]:first')
            .parent()
            .addClass('hidden');
        }
        if (this.$container.next('.matrixblock').length) {
          this.$actionMenu
            .find('button[data-action=moveDown]:first')
            .parent()
            .removeClass('hidden');
        } else {
          this.$actionMenu
            .find('button[data-action=moveDown]:first')
            .parent()
            .addClass('hidden');
        }
      });

      actionDisclosure.on('hide', () => {
        this.$container.removeClass('active');
      });

      this.$actionMenuOptions = this.$actionMenu.find('button[data-action]');

      this.addListener(
        this.$actionMenuOptions,
        'activate',
        this.handleActionClick
      );

      // Was this entry already collapsed?
      if (Garnish.hasAttr(this.$container, 'data-collapsed')) {
        this.collapse();
      }

      this._handleTitleBarClick = function (ev) {
        ev.preventDefault();
        this.toggle();
      };

      this.addListener(this.$titlebar, 'doubletap', this._handleTitleBarClick);

      this.visibleLayoutElements = this.$container.data(
        'visible-layout-elements'
      );
      this.formObserver = new Craft.FormObserver(this.$container, (data) => {
        this.updateFieldLayout(data);
      });
    },

    toggle: function () {
      if (this.collapsed) {
        this.expand();
      } else {
        this.collapse(true);
      }
    },

    collapse: function (animate) {
      if (this.collapsed) {
        return;
      }

      this.$container.addClass('collapsed');

      let previewHtml = '';
      const $fields = this.$fieldsContainer.children().children();

      for (let i = 0; i < $fields.length; i++) {
        const $field = $($fields[i]);
        const $inputs = $field
          .children('.input')
          .find('select,input[type!="hidden"],textarea,.label');
        let inputPreviewText = '';

        for (let j = 0; j < $inputs.length; j++) {
          const $input = $($inputs[j]);
          let value;

          if ($input.hasClass('label')) {
            const $maybeLightswitchContainer = $input.parent().parent();

            if (
              $maybeLightswitchContainer.hasClass('lightswitch') &&
              (($maybeLightswitchContainer.hasClass('on') &&
                $input.hasClass('off')) ||
                (!$maybeLightswitchContainer.hasClass('on') &&
                  $input.hasClass('on')))
            ) {
              continue;
            }

            value = $input.text();
          } else {
            value = Craft.getText(this._inputPreviewText($input));
          }

          if (Array.isArray(value)) {
            value = value.join(', ');
          }

          if (value) {
            value = Craft.escapeHtml(value).trim();

            if (value) {
              if (inputPreviewText) {
                inputPreviewText += ', ';
              }

              inputPreviewText += value;
            }
          }
        }

        if (inputPreviewText) {
          previewHtml +=
            (previewHtml ? ' <span>|</span> ' : '') + inputPreviewText;
        }
      }

      this.$previewContainer.html(previewHtml);

      this.$fieldsContainer.velocity('stop');
      this.$container.velocity('stop');

      if (animate && !Garnish.prefersReducedMotion()) {
        this.$fieldsContainer.velocity('fadeOut', {duration: 'fast'});
        this.$container.velocity({height: 34}, 'fast');
      } else {
        this.$previewContainer.show();
        this.$fieldsContainer.hide();
        this.$container.css({height: 34});
      }

      this.$tabContainer.hide();

      setTimeout(() => {
        this.$actionMenu
          .find('button[data-action=collapse]:first')
          .parent()
          .addClass('hidden');
        this.$actionMenu
          .find('button[data-action=expand]:first')
          .parent()
          .removeClass('hidden');
      }, 200);

      // Remember that?
      if (!this.isNew) {
        Craft.MatrixInput.rememberCollapsedEntryId(this.id);
      } else {
        if (!this.$collapsedInput) {
          this.$collapsedInput = $(
            '<input type="hidden" name="' +
              this.matrix.inputNamePrefix +
              '[entries][' +
              this.id +
              '][collapsed]" value="1"/>'
          ).appendTo(this.$container);
        } else {
          this.$collapsedInput.val('1');
        }
      }

      this.collapsed = true;
    },

    _inputPreviewText: function ($input) {
      if ($input.is('select,multiselect')) {
        const labels = [];
        const $options = $input.find('option:selected');
        for (let k = 0; k < $options.length; k++) {
          labels.push($options.eq(k).text());
        }
        return labels;
      }

      if (
        $input.is('input[type="checkbox"]:checked,input[type="radio"]:checked')
      ) {
        const id = $input.attr('id');
        const $label = $(`label[for="${id}"]`);
        if ($label.length) {
          return $label.text();
        }
      }

      return Garnish.getInputPostVal($input);
    },

    expand: function () {
      if (!this.collapsed) {
        return;
      }

      this.$container.removeClass('collapsed');

      this.$fieldsContainer.velocity('stop');
      this.$container.velocity('stop');

      const collapsedContainerHeight = this.$container.height();
      this.$container.height('auto');
      this.$fieldsContainer.show();
      const expandedContainerHeight = this.$container.height();
      const displayValue = this.$fieldsContainer.css('display') || 'block';
      this.$container.height(collapsedContainerHeight);
      this.$fieldsContainer
        .hide()
        .velocity('fadeIn', {duration: 'fast', display: displayValue});

      const animationDuration = Garnish.prefersReducedMotion() ? 0 : 'fast';
      this.$container.velocity(
        {height: expandedContainerHeight},
        animationDuration,
        () => {
          this.$previewContainer.html('');
          this.$container.height('auto');
          this.$container.trigger('scroll');
          this.$tabContainer.show();
        }
      );

      setTimeout(() => {
        this.$actionMenu
          .find('button[data-action=collapse]:first')
          .parent()
          .removeClass('hidden');
        this.$actionMenu
          .find('button[data-action=expand]:first')
          .parent()
          .addClass('hidden');
      }, 200);

      // Remember that?
      if (!this.isNew && typeof Storage !== 'undefined') {
        const collapsedEntries = Craft.MatrixInput.getCollapsedEntryIds();
        const collapsedEntriesIndex = $.inArray('' + this.id, collapsedEntries);

        if (collapsedEntriesIndex !== -1) {
          collapsedEntries.splice(collapsedEntriesIndex, 1);
          Craft.MatrixInput.setCollapsedEntryIds(collapsedEntries);
        }
      }

      if (!this.isNew) {
        Craft.MatrixInput.forgetCollapsedEntryId(this.id);
      } else if (this.$collapsedInput) {
        this.$collapsedInput.val('');
      }

      this.collapsed = false;
    },

    disable: function () {
      this.$container.children('input[name$="[enabled]"]:first').val('');
      this.$container.addClass('disabled-entry');

      setTimeout(() => {
        this.$actionMenu
          .find('button[data-action=disable]:first')
          .parent()
          .addClass('hidden');
        this.$actionMenu
          .find('button[data-action=enable]:first')
          .parent()
          .removeClass('hidden');
      }, 200);

      this.collapse(true);
    },

    enable: function () {
      this.$container.children('input[name$="[enabled]"]:first').val('1');
      this.$container.removeClass('disabled-entry');

      setTimeout(() => {
        this.$actionMenu
          .find('button[data-action=disable]:first')
          .parent()
          .removeClass('hidden');
        this.$actionMenu
          .find('button[data-action=enable]:first')
          .parent()
          .addClass('hidden');
      }, 200);
    },

    moveUp: function () {
      this.matrix.trigger('beforeMoveEntryUp', {
        entry: this,
      });
      let $prev = this.$container.prev('.matrixblock');
      if ($prev.length) {
        this.$container.insertBefore($prev);
        this.matrix.entrySelect.resetItemOrder();
      }
      this.matrix.trigger('moveEntryUp', {
        entry: this,
      });
    },

    moveDown: function () {
      this.matrix.trigger('beforeMoveEntryDown', {
        entry: this,
      });
      let $next = this.$container.next('.matrixblock');
      if ($next.length) {
        this.$container.insertAfter($next);
        this.matrix.entrySelect.resetItemOrder();
      }
      this.matrix.trigger('moveEntryDown', {
        entry: this,
      });
    },

    handleActionClick: function (event) {
      event.preventDefault();
      this.onActionSelect(event.target);
    },

    onActionSelect: function (option) {
      const batchAction =
          this.matrix.entrySelect.totalSelected > 1 &&
          this.matrix.entrySelect.isSelected(this.$container),
        $option = $(option);

      switch ($option.data('action')) {
        case 'collapse': {
          if (batchAction) {
            this.matrix.collapseSelectedEntries();
          } else {
            this.collapse(true);
          }

          break;
        }

        case 'expand': {
          if (batchAction) {
            this.matrix.expandSelectedEntries();
          } else {
            this.expand();
          }

          break;
        }

        case 'disable': {
          if (batchAction) {
            this.matrix.disableSelectedEntries();
          } else {
            this.disable();
          }

          break;
        }

        case 'enable': {
          if (batchAction) {
            this.matrix.enableSelectedEntries();
          } else {
            this.enable();
            this.expand();
          }

          break;
        }

        case 'moveUp': {
          this.moveUp();
          break;
        }

        case 'moveDown': {
          this.moveDown();
          break;
        }

        case 'add': {
          const type = $option.data('type');
          this.matrix.addEntry(type, this.$container);
          break;
        }

        case 'delete': {
          if (batchAction) {
            if (
              confirm(
                Craft.t(
                  'app',
                  'Are you sure you want to delete the selected entries?'
                )
              )
            ) {
              this.matrix.deleteSelectedEntries();
            }
          } else {
            this.selfDestruct();
          }

          break;
        }
      }

      this.actionDisclosure.hide();
    },

    selfDestruct: function () {
      // Remove any inputs from the form data
      $('[name]', this.$container).removeAttr('name');

      this.$container.velocity(
        this.matrix.getHiddenEntryCss(this.$container),
        'fast',
        () => {
          this.$container.remove();
          this.matrix.updateAddEntryBtn();

          this.matrix.trigger('entryDeleted', {
            $entry: this.$container,
          });
        }
      );
    },

    updateFieldLayout(data) {
      return new Promise((resolve, reject) => {
        const elementEditor = this.matrix.elementEditor;
        const baseInputName = this.$container.data('base-input-name');

        // Ignore if we're already submitting the main form
        if (elementEditor?.submittingForm) {
          reject('Form already being submitted.');
          return;
        }

        if (this.cancelToken) {
          this.ignoreFailedRequest = true;
          this.cancelToken.cancel();
        }

        const param = (n) => Craft.namespaceInputName(n, baseInputName);
        const extraData = {
          [param('visibleLayoutElements')]: this.visibleLayoutElements,
          [param('elementType')]: 'craft\\elements\\Entry',
          [param('ownerId')]: this.matrix.settings.ownerId,
          [param('fieldId')]: this.matrix.settings.fieldId,
          [param('sortOrder')]: this.$container.index() + 1,
          [param('typeId')]: this.$container.data('type-id'),
          [param('elementUid')]: this.$container.data('uid'),
        };

        const selectedTabId = this.$fieldsContainer
          .children('[data-layout-tab]:not(.hidden)')
          .data('id');
        if (selectedTabId) {
          extraData[param('selectedTab')] = selectedTabId;
        }

        data += `&${$.param(extraData)}`;

        this.cancelToken = axios.CancelToken.source();

        Craft.sendActionRequest('POST', 'elements/update-field-layout', {
          cancelToken: this.cancelToken.token,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'X-Craft-Namespace': baseInputName,
          },
          data,
        })
          .then((response) => {
            this._afterUpdateFieldLayout(
              data,
              selectedTabId,
              baseInputName,
              response
            );
            resolve();
          })
          .catch((e) => {
            if (!this.ignoreFailedRequest) {
              reject(e);
            }
            this.ignoreFailedRequest = false;
          })
          .finally(() => {
            this.cancelToken = null;
          });
      });
    },

    async _afterUpdateFieldLayout(
      data,
      selectedTabId,
      baseInputName,
      response
    ) {
      // capture the new selected tab ID, in case it just changed
      const newSelectedTabId = this.$fieldsContainer
        .children('[data-layout-tab]:not(.hidden)')
        .data('id');

      // Update the visible elements
      let $allTabContainers = $();
      const visibleLayoutElements = {};
      let changedElements = false;

      for (const tabInfo of response.data.missingElements) {
        let $tabContainer = this.$fieldsContainer.children(
          `[data-layout-tab="${tabInfo.uid}"]`
        );

        if (!$tabContainer.length) {
          $tabContainer = $('<div/>', {
            id: Craft.namespaceId(tabInfo.id, baseInputName),
            class: 'flex-fields',
            'data-id': tabInfo.id,
            'data-layout-tab': tabInfo.uid,
          });
          if (tabInfo.id !== selectedTabId) {
            $tabContainer.addClass('hidden');
          }
          $tabContainer.appendTo(this.$fieldsContainer);
        }

        $allTabContainers = $allTabContainers.add($tabContainer);

        for (const elementInfo of tabInfo.elements) {
          if (elementInfo.html !== false) {
            if (!visibleLayoutElements[tabInfo.uid]) {
              visibleLayoutElements[tabInfo.uid] = [];
            }
            visibleLayoutElements[tabInfo.uid].push(elementInfo.uid);

            if (typeof elementInfo.html === 'string') {
              const $oldElement = $tabContainer.children(
                `[data-layout-element="${elementInfo.uid}"]`
              );
              const $newElement = $(elementInfo.html);
              if ($oldElement.length) {
                $oldElement.replaceWith($newElement);
              } else {
                $newElement.appendTo($tabContainer);
              }
              Craft.initUiElements($newElement);
              changedElements = true;
            }
          } else {
            const $oldElement = $tabContainer.children(
              `[data-layout-element="${elementInfo.uid}"]`
            );
            if (
              !$oldElement.length ||
              !Garnish.hasAttr($oldElement, 'data-layout-element-placeholder')
            ) {
              const $placeholder = $('<div/>', {
                class: 'hidden',
                'data-layout-element': elementInfo.uid,
                'data-layout-element-placeholder': '',
              });

              if ($oldElement.length) {
                $oldElement.replaceWith($placeholder);
              } else {
                $placeholder.appendTo($tabContainer);
              }

              changedElements = true;
            }
          }
        }
      }

      // Remove any unused tab content containers
      // (`[data-layout-tab=""]` == unconditional containers, so ignore those)
      const $unusedTabContainers = this.$fieldsContainer
        .children('[data-layout-tab]')
        .not($allTabContainers)
        .not('[data-layout-tab=""]');
      if ($unusedTabContainers.length) {
        $unusedTabContainers.remove();
        changedElements = true;
      }

      // Make the first tab visible if no others are
      if (!$allTabContainers.filter(':not(.hidden)').length) {
        $allTabContainers.first().removeClass('hidden');
      }

      this.visibleLayoutElements = visibleLayoutElements;

      // Update the tabs
      if (this.tabManager) {
        this.tabManager.destroy();
        this.tabManager = null;
        this.$tabContainer.html('');
      }

      this.hasTabs = !!response.data.tabs;

      if (this.hasTabs) {
        this.$tabContainer.append(response.data.tabs);
        this.tabManager = Craft.MatrixInput.initTabs(this.$tabContainer);

        // was a new tab selected after the request was kicked off?
        if (
          selectedTabId &&
          newSelectedTabId &&
          selectedTabId !== newSelectedTabId
        ) {
          const $newSelectedTab = this.tabManager.$tabs.filter(
            `[data-id="${newSelectedTabId}"]`
          );
          if ($newSelectedTab.length) {
            // if the new tab is visible - switch to it
            this.tabManager.selectTab($newSelectedTab);
          } else {
            // if the new tab is not visible (e.g. hidden by a condition)
            // switch to the first tab
            this.tabManager.selectTab(this.tabManager.$tabs.first());
          }
        }
      }

      await Craft.appendHeadHtml(response.data.headHtml);
      await Craft.appendBodyHtml(response.data.bodyHtml);

      // re-grab dismissible tips, re-attach listener, hide on re-load
      this.matrix.elementEditor?.handleDismissibleTips();
    },
  });


})(jQuery);
