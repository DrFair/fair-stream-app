import React, { Component } from 'react'

class FilterSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      settings: {}
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(name, value) {
    console.log(name, value);
    let newSettings = {};
    newSettings[name] = value;
    newSettings = Object.assign(this.state.settings, newSettings);

    const { settings } = this.props;
    const filters = settings ? settings.notificationFilters : undefined;
    if (filters && filters[name] === newSettings[name]) {
      delete newSettings[name];
    }
    this.setState({
      settings: newSettings
    });
  }

  render() {
    const { settings, setSettings, onApply, smallApply } = this.props;
    const filters = settings ? settings.notificationFilters : undefined;
    return (
      <>
        <div className="form-group">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showHidden : true} ref={this.showHidden} onChange={(e) => this.handleChange('showHidden', e.target.checked)} />
            <label className="form-check-label">Show hidden</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showBits : true} ref={this.showBits} onChange={(e) => this.handleChange('showBits', e.target.checked)} />
            <label className="form-check-label">Show bits</label>
          </div>
          <label>Minimum bits</label>
          <input className="form-control form-control-sm mb-1" type="number" style={{ maxWidth: 400 }} defaultValue={filters ? filters.minBits : 0} ref={this.minBits} onChange={(e) => {
            let value = Number(e.target.value);
            if (isNaN(value)) value = 0;
            this.handleChange('minBits', value);
          }} />
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showNewsubs : true} ref={this.showNewsubs} onChange={(e) => this.handleChange('showNewsubs', e.target.checked)} />
            <label className="form-check-label">Show new subs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showResubs : true} ref={this.showResubs} onChange={(e) => this.handleChange('showResubs', e.target.checked)} />
            <label className="form-check-label">Show resubs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showGiftsubs : true} ref={this.showGiftsubs} onChange={(e) => this.handleChange('showGiftsubs', e.target.checked)} />
            <label className="form-check-label">Show gift subs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showMassGiftsubs : true} ref={this.showMassGiftsubs} onChange={(e) => this.handleChange('showMassGiftsubs', e.target.checked)} />
            <label className="form-check-label">Show mass gift subs</label>
          </div>
        </div>
        <button
          className={'btn btn-primary' + (smallApply ? ' btn-sm' : '')}
          onClick={() => {
            setSettings({
              notificationFilters: this.state.settings
            });
            if (onApply) onApply();
          }}
          disabled={Object.keys(this.state.settings).length === 0}
        >
          Apply filters
        </button>
      </>
    )
  }
}

export default FilterSettings;