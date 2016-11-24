import React from 'react';

export default class Detail extends React.Component {
  static propTypes = {
    item: React.PropTypes.object,
  };

  _onBlur = () => {
    const {item} = this.props;
    item.content = this.refs.content.innerHTML;
    item.name = this.refs.name.innerText;

    window.Database.inTransaction((t) => {
      return t.persistModel(item);
    });
  }

  _onPopout = () => {

  }

  _onDelete = () => {
    window.Database.inTransaction((t) => {
      return t.unpersistModel(this.props.item);
    });
  }

  render() {
    if (!this.props.item) {
      return (
        <div className="detail">
          <div className="empty">Please select an item</div>
        </div>
      );
    }

    const {name, content} = this.props.item;
    return (
      <div className="detail">
        <div className="actions">
          <button
            onClick={this._onPopout}
            title="Popout"
            className="popout" />
          <button
            onClick={this._onDelete}
            title="Delete"
            className="delete" />
        </div>
        <h2
          ref="name"
          contentEditable
          onBlur={this._onBlur}
          dangerouslySetInnerHTML={{__html: name}}
        />
        <div
          ref="content"
          className="content"
          contentEditable
          dangerouslySetInnerHTML={{__html: content}}
          onBlur={this._onBlur}
        />
      </div>
    );
  }
}
