/* eslint-disable ember/no-classic-components */
import Component from "@ember/component"
import layout from "../templates/components/feature-controls"
import { inject as service } from "@ember/service"
import { action, set } from "@ember/object"
import { assign } from "@ember/polyfills"
import config from "ember-get-config"
import windowUtil from "ember-feature-controls/utils/window"
import classic from "ember-classic-decorator"

const {
  featureControls,
  featureFlags,
} = config

@classic
export default class FeatureControls extends Component {
  @service featureControlStorage
  @service features

  layout = layout
  tagName = ''

  featureControls = featureControls
  featureFlags = featureFlags

  showRefresh = true
  showReset = true

  init() {
    super.init(...arguments)
    this.refresh()
  }

  _normalizeFlag(key) {
    return this.features._normalizeFlag(key)
  }

  // Refresh the state of the feature flags list component
  @action
  refresh() {
    // Take the existing flags from the config and put them in a list of default values
    let { featureFlags } = this
    let defaults = {}

    for (let key in featureFlags) {
      defaults[this._normalizeFlag(key)] = featureFlags[key]
    }

    // Model is a local copy of the list of flags register for features service, used to compute properties on the full list
    let model = (this.features.flags || []).map((key) => {
      let meta = ((featureControls && this.featureControls.metadata) || []).find(
        (obj) => this._normalizeFlag(obj.key) === key
      ) || {}

      if (meta.hide === true) {
        return undefined
      }

      let isFlagLS = (
        this.featureControls.useLocalStorage
        && this.get(`featureControlStorage.${key}`) !== undefined
      )

      let featureFlag = {
        key,
        isEnabled: isFlagLS
          ? this.get(`featureControlStorage.featuresLS.${key}`)
          : this.features.isEnabled(key),
        default: defaults[key] || false
      }

      return assign({}, meta, featureFlag)
    })

    set(this, "model", model.filter(item => item !== undefined))
  }

  @action
  reset() {
    // Reset the flags from the features service to the default value in the config
    let { featureFlags } = this

    Object.keys(featureFlags).forEach((key) => {
      this.updateFeature(this._normalizeFlag(key), featureFlags[key])
    })

    // If we use local storage then we want to clear the stored data
    if (this.featureControls.useLocalStorage) {
      this.featureControlStorage.featuresLS.reset()
    }
  }

  updateFeature(key, isEnabled) {
    if (isEnabled) {
      this.features.enable(key)
    } else {
      this.features.disable(key)
    }

    // Update the local model accordingly
    let { model } = this
    let modelFlag = model.find((obj) => obj.key === key)

    if (modelFlag) {
      set(modelFlag, "isEnabled", isEnabled)
      set(this, "model", model)

      if (modelFlag.reload) {
        windowUtil.reload()
      }
    }
  }

  @action
  doToggleFeature(key, checkboxState) {
    this.updateFeature(key, !checkboxState)

    if (this.featureControls.useLocalStorage) {
      this.set(`featureControlStorage.featuresLS.${key}`, !checkboxState)
    }
  }
}
