import { mount } from 'enzyme'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import yup from 'yup'

import inputs from '../src/inputs'
import Form from '../src'

describe('Field', () => {
  let schema = yup.object({
    name: yup.string().default(''),
    more: yup.object().when('name', {
      is: 'jason',
      then: yup.object({
        isCool: yup.bool(),
      }),
    }),
  })

  class TestInput extends React.Component {
    render() {
      return <input value={this.props.value || ''} onChange={e => this.props.onChange(e, 'hi')} />
    }
  }

  it('should pass props to inner type', function() {
    mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" type={TestInput} className="test" />
      </Form>
    )
      .find(TestInput)
      .instance()
      .props.className.should.include('test') // test invalid-field
  })

  it('should fall back to using schema types', function() {
    let schema = yup.object({
      string: yup.string(),
      number: yup.number(),
      date: yup.date(),
      bool: yup.bool(),
      array: yup.array().of(yup.string()),
    })

    let wrapper = mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="string" />
        <Form.Field name="number" />
        <Form.Field name="date" />
        <Form.Field name="bool" />
        <Form.Field name="array" />
      </Form>
    )

    wrapper.assertSingle(`Input[name='string']`)

    wrapper.assertSingle(inputs.Number)
    wrapper.assertSingle(inputs.Bool)
    wrapper.assertSingle(inputs.Select)
    wrapper.assertSingle(inputs.Date)
  })

  it('should use schema metadata', function() {
    let schema = yup.object({
      string: yup.string().meta({
        reactFormalType: 'number',
      }),
    })

    mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="string" />
      </Form>
    ).assertSingle(inputs.Number)
  })

  it('should use type override', function() {
    let wrapper = mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" />
        <Form.Field name="name" type="textarea" />
        <Form.Field name="name" type={TestInput} />
      </Form>
    )
    wrapper.assertSingle(TestInput)
    wrapper.find(inputs.Input).length.should.equal(2)
  })

  it('should not warn about refs on stateless components', function() {
    sinon.spy(console, 'error')

    mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" type={() => null} />
      </Form>
    )

    console.error.should.not.have.been.called
    console.error.restore()
  })

  it('should fire onChange', function(done) {
    mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" type={TestInput} onChange={() => done()} />
      </Form>
    )
      .assertSingle('input')
      .simulate('change')
  })

  it('ensures values are never undefined', function() {
    let wrapper = mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" />
      </Form>
    )

    chai.expect(wrapper.assertSingle('Input').prop('value')).to.equal(null)
  })

  it('maps value from string', function() {
    let spy = sinon.spy()
    mount(
      <Form schema={schema} defaultValue={{}} onChange={spy}>
        <Form.Field name="name" type={TestInput} mapFromValue="value" />
      </Form>
    )
      .assertSingle('input')
      .simulate('change', { value: 'john' })

    spy.should.have.been.calledOnce.and.calledWith({ name: 'john' })
  })

  it('maps value from function', function() {
    let spy = sinon.spy()
    mount(
      <Form schema={schema} defaultValue={{}} onChange={spy}>
        <Form.Field name="name" type={TestInput} mapFromValue={e => e.value} />
      </Form>
    )
      .assertSingle('input')
      .simulate('change', { value: 'john' })

    spy.should.have.been.calledOnce.and.calledWith({ name: 'john' })
  })

  it('gets value from accessor', function() {
    let spy = sinon.spy(model => model.other)
    let wrapper = mount(
      <Form schema={schema} defaultValue={{}} onChange={spy}>
        <Form.Field
          name="name"
          type={TestInput}
          mapToValue={spy}
          mapFromValue={{
            other: e => e.value,
          }}
        />
      </Form>
    )

    spy.should.have.been.and.calledWith({})

    wrapper.assertSingle('input').simulate('change', { value: 'john' })

    spy.should.have.been.and.calledWith({ other: 'john' })
  })

  it('gets value from map accessor', function() {
    mount(
      <Form schema={schema} defaultValue={{ name: 'foo', lastName: 'bar' }}>
        <Form.Field
          name="name"
          type={TestInput}
          mapToValue={{
            first: 'name',
            last: 'lastName',
          }}
        />
      </Form>
    )
      .assertSingle(TestInput)
      .prop('value')
      .should.eql({
        first: 'foo',
        last: 'bar',
      })
  })

  it('gets value from map accessor functions', function() {
    mount(
      <Form schema={schema} defaultValue={{ name: 'foo', lastName: 'bar' }}>
        <Form.Field
          name="name"
          type={TestInput}
          mapToValue={{
            first: v => v.name,
            last: v => v.lastName,
          }}
        />
      </Form>
    )
      .assertSingle(TestInput)
      .prop('value')
      .should.eql({
        first: 'foo',
        last: 'bar',
      })
  })

  it('maps values from hash', function() {
    let spy = sinon.spy()
    mount(
      <Form schema={schema} defaultValue={{}} onChange={spy}>
        <Form.Field
          name="name"
          type={TestInput}
          mapFromValue={{
            name: e => e.value,
            text: 'text',
          }}
        />
      </Form>
    )
      .assertSingle('input')
      .simulate('change', { value: 'john', text: 'hi' })

    spy.should.have.been.calledOnce.and.calledWith({ name: 'john', text: 'hi' })
  })

  it('should pass all args to mapFromValue', function(done) {
    let spy = sinon.spy()
    mount(
      <Form schema={schema} defaultValue={{}} onChange={spy}>
        <Form.Field
          name="name"
          type={TestInput}
          mapFromValue={(...args) => {
            args.length.should.equal(2)
            args[1].should.equal('hi')
            done()
          }}
        />
      </Form>
    )
      .assertSingle('input')
      .simulate('change')
  })

  describe('meta', () => {
    it('should pass meta to form', () => {
      let Input = ({ meta }) => {
        meta.should.have.property('invalid').that.equals(true)
        meta.should.have.property('valid').that.equals(false)
        meta.should.have.property('errors').that.eqls({
          name: 'foo',
        })

        return null
      }

      mount(
        <Form schema={schema} defaultValue={{}} defaultErrors={{ name: 'foo' }}>
          <Form.Field name="name" type={Input} />
        </Form>
      )
    })

    it('should field onError should remove existing errors', () => {
      let errorSpy = sinon.spy()
      mount(
        <Form
          schema={schema}
          defaultValue={{}}
          defaultErrors={{ name: 'foo', bar: 'baz' }}
          onError={errorSpy}
        >
          <Form.Field name="name" type={TestInput} />
        </Form>
      )
        .find(TestInput)
        .props()
        .meta.onError({})

      errorSpy.should.have.been.calledOnce.and.calledWith({ bar: 'baz' })
    })

    it('should field onError should update field errors', () => {
      let errorSpy = sinon.spy()
      mount(
        <Form
          schema={schema}
          defaultValue={{}}
          defaultErrors={{ name: 'foo', bar: 'baz' }}
          onError={errorSpy}
        >
          <Form.Field name="name" type={TestInput} />
        </Form>
      )
        .find(TestInput)
        .props()
        .meta.onError({ name: 'foo', 'name.first': 'baz' })

      errorSpy.should.have.been.calledOnce.and.calledWith({
        name: 'foo',
        'name.first': 'baz',
        bar: 'baz',
      })
    })

    it('should field onError should replace field errors', () => {
      let errorSpy = sinon.spy()
      mount(
        <Form
          schema={schema}
          defaultValue={{}}
          defaultErrors={{ name: 'foo', bar: 'baz' }}
          onError={errorSpy}
        >
          <Form.Field name="name" type={TestInput} />
        </Form>
      )
        .find(TestInput)
        .props()
        .meta.onError({ 'name.first': 'baz' })

      errorSpy.should.have.been.calledOnce.and.calledWith({
        'name.first': 'baz',
        bar: 'baz',
      })
    })
  })

  describe('inclusive active matching', () => {
    it('should count path matches', function() {
      mount(
        <Form schema={schema} defaultValue={{}} defaultErrors={{ name: 'foo' }}>
          <Form.Field name="name" errorClass="invalid" />
        </Form>
      ).assertSingle('input.invalid')
    })

    it('should use inclusive active checking', function() {
      mount(
        <Form schema={schema} defaultValue={{}} defaultErrors={{ 'name.first': 'foo' }}>
          <Form.Field name="name" errorClass="invalid" />
        </Form>
      ).assertSingle('input.invalid')
    })

    it('should respect `exclusive`', function() {
      mount(
        <Form schema={schema} defaultValue={{}} defaultErrors={{ 'name.first': 'foo' }}>
          <Form.Field exclusive name="name" errorClass="invalid" />
        </Form>
      ).assertNone('input.invalid')
    })

    it('should respect `exclusive` and still have errors', () => {
      mount(
        <Form schema={schema} defaultValue={{}} defaultErrors={{ name: 'foo' }}>
          <Form.Field exclusive name="name" errorClass="invalid" />
        </Form>
      ).assertSingle('input.invalid')
    })
  })

  xdescribe('form fields', () => {
    it('should inject onError', () => {
      mount(
        <Form schema={schema} defaultValue={{}}>
          <Form.Field name="name" />
        </Form>
      )
        .find('input')
        .prop('onError')
        .should.be.a('function')
    })

    // skip for now since name is still required.
    xit('should not inject onError for nameless fields', () => {
      mount(
        <Form schema={schema} defaultValue={{}}>
          <Form.Field />
        </Form>
      )
        .find('input')
        .prop('onError')
        .should.be.a('function')
    })

    it('should propagate onError to form', () => {
      let spy = sinon.spy()

      mount(
        <Form schema={schema} defaultValue={{}} onError={spy}>
          <Form.Field name="name" />
        </Form>
      )
        .find('input')
        .prop('onError')({ foo: 'bar' })

      spy.should.have.been.calledOnce.and.calledWith({
        'name.foo': 'bar',
      })
    })

    it('should properly prefix nested errors', () => {
      mount(
        <Form schema={schema} defaultValue={{}}>
          <Form.Field name="name" />
        </Form>
      )
        .find('input')
        .prop('onError')

      onError({ foo: 'bar' }).should.eql({ 'name.foo': 'bar' })
      onError({ '[1].foo': 'bar' }).should.eql({ 'name[1].foo': 'bar' })
      onError({ '[1].baz.foo': 'bar' }).should.eql({ 'name[1].baz.foo': 'bar' })
    })
  })

  it('should expose input wrapperance', function() {
    let wrapper = mount(
      <Form schema={schema} defaultValue={{}}>
        <Form.Field name="name" type={TestInput} />
      </Form>
    )
    ;(wrapper
      .assertSingle(Form.Field)
      .instance()
      .inputInstance() instanceof TestInput
    ).should.be.true
  })

  it('should work with conditional schema', function() {
    let render = name =>
      ReactDOMServer.renderToString(
        <Form schema={schema} defaultValue={{ ...schema.default(), name }}>
          <Form.Field name="more.isCool" />
        </Form>
      )
    ;(() => render('jason')).should.not.throw()
    ;(() => render('john')).should.throw()
  })
})
