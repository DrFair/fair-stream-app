import React, { Component } from 'react'

class FilterSettings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      canApply: false
    };

    this.showBits = React.createRef();
    this.minBits = React.createRef();
    this.showNewsubs = React.createRef();
    this.showResubs = React.createRef();
    this.showGiftsubs = React.createRef();
    this.showMassGiftsubs = React.createRef();
    this.updateApply = this.updateApply.bind(this);
  }

  updateApply() {
    const { settings } = this.props;
    const filters = settings ? settings.notificationFilters : undefined;
    const showBitsValue = this.showBits.current.checked;
    const minBitsValue = Number(this.minBits.current.value);
    const showNewsubsValue = this.showNewsubs.current.checked;
    const showResubsValue = this.showResubs.current.checked;
    const showGiftsubsValue = this.showGiftsubs.current.checked;
    const showMassGiftsubsValue = this.showMassGiftsubs.current.checked;
    this.setState({
      canApply: canApply()
    });

    
    function canApply() {
      if (!filters) return false;
      if (showBitsValue !== filters.showBits) return true;
      if (minBitsValue !== filters.minBits) return true;
      if (showNewsubsValue !== filters.showNewsubs) return true;
      if (showResubsValue !== filters.showResubs) return true;
      if (showGiftsubsValue !== filters.showGiftsubs) return true;
      if (showMassGiftsubsValue !== filters.showMassGiftsubs) return true;
      return false;
    }
  }

  componentDidMount() {
    this.updateApply();
  }

  componentDidUpdate(prevProps) {
    if (this.props.settings !== prevProps.settings) {
      this.updateApply();
    }
  }

  render() {
    const { settings, setSettings } = this.props;
    const filters = settings ? settings.notificationFilters : undefined;
    const { canApply } = this.state;
    return (
      <>
        <div className="form-group">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showbits : true} ref={this.showBits} onChange={this.updateApply} />
            <label className="form-check-label">Show bits</label>
          </div>
          <label>Minimum bits</label>
          <input className="form-control form-control-sm mb-1" type="number" style={{ maxWidth: 400 }} defaultValue={filters ? filters.minBits : 0} ref={this.minBits} onChange={this.updateApply} />
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showNewsubs : true} ref={this.showNewsubs} onChange={this.updateApply} />
            <label className="form-check-label">Show new subs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showResubs : true} ref={this.showResubs} onChange={this.updateApply} />
            <label className="form-check-label">Show resubs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showGiftsubs : true} ref={this.showGiftsubs} onChange={this.updateApply} />
            <label className="form-check-label">Show gift subs</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" defaultChecked={filters ? filters.showMassGiftsubs : true} ref={this.showMassGiftsubs} onChange={this.updateApply} />
            <label className="form-check-label">Show mass gift subs</label>
          </div>
        </div>
        <button 
          className="btn settings-apply"
          onClick={() => {
            const showBitsValue = this.showBits.current.checked;
            let minBitsValue = Number(this.minBits.current.value);
            const showNewsubsValue = this.showNewsubs.current.checked;
            const showResubsValue = this.showResubs.current.checked;
            const showGiftsubsValue = this.showGiftsubs.current.checked;
            const showMassGiftsubsValue = this.showMassGiftsubs.current.checked;
            if (isNaN(minBitsValue)) minBitsValue = 0;
            setSettings({
              notificationFilters: {
                showBits: showBitsValue,
                minBits: minBitsValue,
                showNewsubs: showNewsubsValue,
                showResubs: showResubsValue,
                showGiftsubs: showGiftsubsValue,
                showMassGiftsubs: showMassGiftsubsValue
              }
            });
          }}
          disabled={!canApply}
        >
          Apply filters
        </button>
      </>
    )
  }
}

export default FilterSettings;