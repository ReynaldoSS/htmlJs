//Retorna id do grupo SharePoint passando o nome dele como parâmetro
//Caso não encontre o grupo, retorna string vazia
function getGroupIDByName(groupName) {
    var ctx = SP.ClientContext.get_current();
    var group = ctx.get_web().get_siteGroups().getByName(groupName);
    ctx.load(group);
    ctx.executeQueryAsync(
        function () {
            var membershipGroupId = group.get_id();
            return membershipGroupId;
        },
        function (sender, args) {
            return '';
        }
    );
}


//Função para adicionar anexos (Utilizado na aba de Análises)
function AddAttachments(listName, itemId, controlName) {
    var digest = "";
    $.ajax({
        url: "/_api/contextinfo",
        method: "POST",
        headers: {
            "ACCEPT": "application/json;odata=verbose",
            "content-type": "application/json;odata=verbose"
        },
        success: function (data) {
            digest = data.d.GetContextWebInformation.FormDigestValue;
        },
        error: function (data) {
        }
    }).done(function () {
        var fileInput = $(controlName);
        var fileName = fileInput[0].files[0].name;
        var reader = new FileReader();
        reader.onload = function (e) {
            var fileData = e.target.result;
            var res11 = $.ajax({
                url: "/_api/web/lists/getbytitle('" + listName + "')/items(" + itemId + ")/AttachmentFiles/ add(FileName='" + fileName + "')",
                method: "POST",
                binaryStringRequestBody: true,
                data: fileData,
                processData: false,
                headers: {
                    "ACCEPT": "application/json;odata=verbose",
                    "X-RequestDigest": digest,
                    "content-length": fileData.byteLength
                },
                success: function (data) {
                },
                error: function (data) {
                }
            });
        };
        reader.readAsArrayBuffer(fileInput[0].files[0]);
    });
}

// Render and initialize the client-side People Picker.
function initializePeoplePicker(peoplePickerElementId, groupName) {

    var groupId = getGroupIDByName(groupName);
    // Create a schema to store picker properties, and set the properties.
    var schema = {};
    schema['PrincipalAccountType'] = 'User,DL,SecGroup,SPGroup';
    schema['SearchPrincipalSource'] = 15;
    schema['ResolvePrincipalSource'] = 15;
    schema['AllowMultipleValues'] = true;
    schema['MaximumEntitySuggestions'] = 50;
    schema['Width'] = '280px';

    if (groupID !== '') {
        schema['SharePointGroupID'] = groupID;
    }


    // Render and initialize the picker.
    // Pass the ID of the DOM element that contains the picker, an array of initial
    // PickerEntity objects to set the picker value, and a schema that defines
    // picker properties.
    this.SPClientPeoplePicker_InitStandaloneControlWrapper(peoplePickerElementId, null, schema);
}

// Query the picker for user information.
function getUserInfo() {

    // Get the people picker object from the page.
    var peoplePicker = this.SPClientPeoplePicker.SPClientPeoplePickerDict.peoplePickerDiv_TopSpan;

    // Get information about all users.
    var users = peoplePicker.GetAllUserInfo();
    var userInfo = '';
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        for (var userProperty in user) {
            userInfo += userProperty + ':  ' + user[userProperty] + '<br>';
        }
    }
    $('#resolvedUsers').html(userInfo);

    // Get user keys.
    var keys = peoplePicker.GetAllUserKeys();
    $('#userKeys').html(keys);

    // Get the first user's ID by using the login name.
    getUserId(users[0].Key);
}

// Get the user ID.
function getUserId(loginName) {
    var context = new SP.ClientContext.get_current();
    this.user = context.get_web().ensureUser(loginName);
    context.load(this.user);
    context.executeQueryAsync(
        Function.createDelegate(null, ensureUserSuccess),
        Function.createDelegate(null, onFail)
    );
}

function ensureUserSuccess() {
    $('#userId').html(this.user.get_id());
}

function onFail(sender, args) {
    alert('Query failed. Error: ' + args.get_message());
}

function AtualizarAgendamento(id) {
    var campos = [];

    $('#main [name].salvar-campo').each(function () {
        var $this = $(this);

        if ($this.is('[type=checkbox]') && $this.val() != undefined) {
            campos.push([this.name, $this.val() == 'on']);
        } else if ($this.is('.date-time-picker')) {
            campos.push([this.name, moment($this.val(), 'DD/MM/YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss[-00:00]')]);
        } else if ($this.val() != undefined) {
            campos.push([this.name, $this.val()]);
        }
    });

    var $promise = $.Deferred();
    CalcularCamposCalculados();

    $().SPServices({
        operation: "UpdateListItems",
        async: false,
        batchCmd: "Update",
        listName: "Agendamentos",
        ID: id,
        valuepairs: campos,
        completefunc: function (xData, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            var $response = $(xData.responseText);
            var errorCode = $response.find('ErrorCode').text();

            if (errorCode == '0x00000000') {
                $promise.resolve({
                    record: $response.find('z\\:row:first')
                });
            } else {
                $promise.reject({
                    errorCode: errorCode,
                    errorText: $response.find('ErrorText').text()
                });
            }
        }
    });

    return $promise;
}

function CalcularCamposCalculados() {
    var $titulo = $('input[name=Title]');
    var $codigoProduto = $('input[name=CodigoProduto]');
    var $projeto = $('input[name=Projeto]');

    $titulo.val($codigoProduto.val() + ' - ' + $projeto.val());
}

function CarregarAgendamento(id) {
    var $promise = $.Deferred();
    $().SPServices({
        operation: 'GetListItems',
        listName: 'Agendamentos',
        CAMLQuery: '<Query><Where><Eq><FieldRef Name="ID" /><Value Type="Number">' + id + '</Value></Eq></Where></Query>',
        CAMLViewFields: '<ViewFields><FieldRef Name="Title" /><FieldRef Name="CodigoProduto" /><FieldRef Name="LinhaProduto" /><FieldRef Name="DescricaoProduto" /><FieldRef Name="Projeto" /><FieldRef Name="CategoriaProjeto" /><FieldRef Name="Motivo" /><FieldRef Name="TipoLote" /><FieldRef Name="QuantidadePecas" /><FieldRef Name="Formula" /><FieldRef Name="EnvioAmostras" /><FieldRef Name="ResponsavelAmostra" /><FieldRef Name="QuantidadeAmostra" /><FieldRef Name="InicioProgramado" /><FieldRef Name="DuracaoEstimadaHoras" /><FieldRef Name="DuracaoEstimadaMinutos" /><FieldRef Name="FimProgramado" /><FieldRef Name="Fabrica" /><FieldRef Name="LinhaEquipamento" /><FieldRef Name="CentroCusto" /><FieldRef Name="GrauComplexidade" /><FieldRef Name="MaoObra" /><FieldRef Name="Observacoes" /><FieldRef Name="Status" /><FieldRef Name="EngenhariaFabricacaoAcompanhamen" /><FieldRef Name="EngenhariaEnvaseAcompanhamento" /><FieldRef Name="InovacaoDfAcompanhamento" /><FieldRef Name="InovacaoDeAcompanhamento" /><FieldRef Name="QualidadeAcompanhamento" /><FieldRef Name="FabricaAcompanhamento" /><FieldRef Name="CodigoAgendamento" /><FieldRef Name="NaoExecutadoMotivo" /><FieldRef Name="NaoExecutadoComentarios" /><FieldRef Name="CanceladoMotivo" /><FieldRef Name="CanceladoComentarios" /><FieldRef Name="ReagendamentoContador" /><FieldRef Name="CalendarioTitulo" /><FieldRef Name="CalendarioSubtitulo" /><FieldRef Name="Executado" /><FieldRef Name="MeioAmbienteAcompanhamento" /><FieldRef Name="RegistroAnalisesInicio" /><FieldRef Name="Modified" /><FieldRef Name="Created" /><FieldRef Name="Author" /><FieldRef Name="Editor" /></ViewFields>',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            var $registro = $(Data.responseText).find('z\\:row:first');

            if (!$registro.length) {
                $promise.reject({
                    errorCode: '0x99999998',
                    errorText: 'Registro não encontrado'
                });

                return;
            }

            var atributos = $registro.get(0).attributes;

            $.each(atributos, function () {
                if (this.value.startsWith('datetime;#')) {
                    this.value = this.value.slice('datetime;#'.length);
                }

                var $elemento = $('#main [name=' + this.name.substr(4) + ' i]');

                if ($elemento.is('[type=checkbox]')) {
                    $elemento.attr('checked', this.value == "1");
                } else if ($elemento.is('[type=number]')) {
                    $elemento.val(AtributoNumber(this.value));
                } else if ($elemento.is('.date-time-picker')) {
                    $elemento.val(moment(this.value, 'YYYY-MM-DD HH:mm:ss').format('DD/MM/YYYY HH:mm'));

                    if ($elemento.is(':not([readonly])')) {
                        $elemento.data('daterangepicker').elementChanged();
                    }
                } else if ($elemento.is('select.select-tabela')) {
                    $elemento.val(this.value.slice(0, this.value.indexOf(';#')));
                } else {
                    $elemento.val(this.value);
                }

                $elemento.change();
            });

            ModificarStatus($('select#status').val());
            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarCategoriaProjeto() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: "GetList",
        listName: "Agendamentos",
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Categoria do projeto"] CHOICE').each(function () {
                $('select#categoriaDoProjeto').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarFabricas() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetListItems',
        listName: 'Fábricas Internas e Armazenamento de Fábricas Terceiras',
        CAMLViewFields: '<ViewFields><FieldRef Name="Title" /><FieldRef Name="ID" /><FieldRef Name="Numero" /></ViewFields>',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).SPFilterNode("z:row").each(function () {
                $('select#fabrica').append('<option value="' + $(this).attr("ows_ID") + '">' + $(this).attr("ows_Title") + ' - ' + $(this).attr("ows_Numero") + '</option>')
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarHistorico(agendamentoId) {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetListItems',
        listName: 'Agendamentos - Histórico',
        CAMLQuery: '<Query><Where><Eq><FieldRef Name="CodigoAgendamento" /><Value Type="Text">' + agendamentoId + '</Value></Eq></Where></Query>',
        CAMLViewFields: '<ViewFields><FieldRef Name="Title" /><FieldRef Name="Area" /><FieldRef Name="Mensagem" /><FieldRef Name="CodigoAgendamento" /><FieldRef Name="Modified" /><FieldRef Name="Created" /><FieldRef Name="Author" /><FieldRef Name="Editor" /></ViewFields>',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            var registros = [];

            $(Data.responseText).find("z\\:row").each(function () {
                var colunas = this.attributes;
                var registro = {};

                $.each(colunas, function () {
                    registro[this.name.substr(4)] = this.value;
                });

                registros.push(registro);
            });

            $promise.resolve(registros);
        }
    });

    return $promise;
}

function CarregarLinhasDoProduto() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: "GetList",
        listName: "Agendamentos",
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Linha do produto"] CHOICE').each(function () {
                $('select#linhaDoProduto').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarLinhasEquipamentos(fabrica, tipoLote) {
    var $promise = $.Deferred();
    var linhaEquipamento = $('select#linhaEquipamento');

    $().SPServices({
        operation: 'GetListItems',
        listName: 'Linhas e Equipamentos',
        CAMLQuery: '<Query><Where><And><And><Eq><FieldRef Name="Ativa" /><Value Type="Boolean">1</Value></Eq><Eq><FieldRef Name="Fabrica" /><Value Type="Lookup">' + fabrica + '</Value></Eq></And><Eq><FieldRef Name="TipoLote" /><Value Type="Choice">' + tipoLote + '</Value></Eq></And></Where></Query>',
        CAMLViewFields: '<ViewFields><FieldRef Name="Title" /><FieldRef Name="ID" /></ViewFields>',
        completefunc: function (Data, Status) {
            linhaEquipamento.find('option')
                .remove()
                .end()
                .append('<option disabled selected>Selecione uma opção</option>')
                ;

            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).SPFilterNode("z:row").each(function () {
                linhaEquipamento.append('<option value="' + $(this).attr("ows_ID") + '">' + $(this).attr("ows_Title") + '</option>')
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarLinhasEquipamentosById(linhaEquipamentoId) {
    var $promise = $.Deferred();
    var linhaEquipamento = $('select#linhaEquipamento');
    var $labelQuantidadePecas = $('label[for="produtoQuantidade"]')
    $labelQuantidadePecas.text("Quantidade (peças)");

    $().SPServices({
        operation: 'GetListItems',
        listName: 'Linhas e Equipamentos',
        CAMLQuery: '<Query><Where><Eq><FieldRef Name="ID" /><Value Type="Number">' + linhaEquipamentoId + '</Value></Eq></Where></Query>',
        CAMLViewFields: '<ViewFields><FieldRef Name="Title" /><FieldRef Name="ID" /></ViewFields>',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).SPFilterNode("z:row").each(function () {
                $labelQuantidadePecas.text("Quantidade (peças) de " + AtributoNumber($(this).attr("ows_CapacidadeMin")) + " até " + AtributoNumber($(this).attr("ows_CapacidadeMax")))
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function AtributoNumber(number) {
    return number | 0;
}

function CarregarListaGrauComplexidade() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetList',
        listName: 'Agendamentos',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Grau de complexidade"] CHOICE').each(function () {
                $('select#grauComplexidade').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarListaMotivos() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetList',
        listName: 'Agendamentos',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Motivo"] CHOICE').each(function () {
                $('select#motivo').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarListaStatus() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetList',
        listName: 'Agendamentos',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Status"] CHOICE').each(function () {
                $('select#status').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function CarregarListaTiposLotes() {
    var $promise = $.Deferred();

    $().SPServices({
        operation: 'GetList',
        listName: 'Agendamentos',
        completefunc: function (Data, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            $(Data.responseXML).find('Field[DisplayName="Tipo de Lote"] CHOICE').each(function () {
                $('select#tipoDeLote').append('<option value="' + this.innerHTML + '">' + this.innerHTML + '</option>');
            });

            $promise.resolve();
        }
    });

    return $promise;
}

function dispararCarregarLinhasEquipamentos() {
    var fabricaVal = $("select#fabrica :selected").text();
    var tipoLoteVal = $("select#tipoDeLote").val();
    if (tipoLoteVal && fabricaVal) {
        CarregarLinhasEquipamentos(fabricaVal, tipoLoteVal);
    }
}

function EscolherAgendamento() {
    var agendamentoId = prompt('Digite o ID do agendamento');

    if (agendamentoId) {
        ResetarAgendamento();

        CarregarAgendamento(agendamentoId).fail(function (response) {
            alert('Ops., algo deu errado. Mensagem: ' + response.errorText);
        });
    }
}

function InserirAgendamento() {
    var campos = [];

    $('#main [name].salvar-campo').each(function () {
        var $this = $(this);

        if ($this.is('[type=checkbox]') && $this.val() != undefined) {
            campos.push([this.name, $this.val() == 'on']);
        } else if ($this.is('.date-time-picker')) {
            campos.push([this.name, moment($this.val(), 'DD/MM/YYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss[-00:00]')]);
        } else if ($this.val() != undefined) {
            campos.push([this.name, $this.val()]);
        }
    });

    var $promise = $.Deferred();
    CalcularCamposCalculados();

    $().SPServices({
        operation: "UpdateListItems",
        async: false,
        batchCmd: "New",
        listName: "Agendamentos",
        valuepairs: campos,
        completefunc: function (xData, Status) {
            if (Status != 'success') {
                $promise.reject({
                    errorCode: '0x99999999',
                    errorText: 'Erro Remoto'
                });

                return;
            }

            var $response = $(xData.responseText);
            var errorCode = $response.find('ErrorCode').text();

            if (errorCode == '0x00000000') {
                $promise.resolve({
                    record: $response.find('z\\:row:first')
                });
            } else {
                $promise.reject({
                    errorCode: errorCode,
                    errorText: $response.find('ErrorText').text()
                });
            }
        }
    });

    return $promise;
}

function InstanciarDateTimePicker() {
    $('.date-time-picker:not([readonly])').daterangepicker({
        opens: 'center',
        singleDatePicker: true,
        showDropdowns: true,
        timePicker: true,
        timePicker24Hour: true,
        locale: {
            format: 'DD/MM/YYYY HH:mm',
            applyLabel: "Aplicar",
            cancelLabel: 'Limpar',
            daysOfWeek: [
                "Do",
                "Se",
                "Te",
                "Qu",
                "Qu",
                "Se",
                "Sa"
            ],
            monthNames: [
                "Janeiro",
                "Fevereiro",
                "Março",
                "Abril",
                "Maio",
                "Junho",
                "Julho",
                "Agosto",
                "Setembro",
                "Outubro",
                "Novembro",
                "Dezembro"
            ]
        }
    });
}

function ModificarBotoesPorStatus(status) {
    var $btnConcluir = $('.btn-concluir');
    var $btnExecutado = $('.btn-executado');
    var $btnAprovar = $('.btn-aprovar');
    var $btnReprovarAprovar = $('.btn-reprovar');

    switch (status) {
        case 'Rascunho':
            $btnConcluir.show();
            $btnExecutado.hide();
            $btnAprovar.hide();
            $btnReprovarAprovar.hide();
            break;
        case 'Agendado':
            $btnConcluir.hide();
            $btnExecutado.show();
            $btnAprovar.hide();
            $btnReprovarAprovar.hide();
            break;
        case 'Registro das Análises':
            $btnConcluir.hide();
            $btnExecutado.hide();
            $btnAprovar.show();
            $btnReprovarAprovar.show();
            break;
    }
}

function ModificarCamposPorStatus(status) {
    var $TipoLote = $('[name=TipoLote]');
    var $Fabrica = $('[name=Fabrica]');
    var $LinhaEquipamento = $('[name=LinhaEquipamento]');
    var $CodigoProduto = $('[name=CodigoProduto]');
    var $LinhaProduto = $('[name=LinhaProduto]');
    var $DescricaoProduto = $('[name=DescricaoProduto]');
    var $Projeto = $('[name=Projeto]');
    var $CategoriaProjeto = $('[name=CategoriaProjeto]');
    var $Formula = $('[name=Formula]');
    var $QuantidadePecas = $('[name=QuantidadePecas]');
    var $Motivo = $('[name=Motivo]');
    var $EnvioAmostras = $('[name=EnvioAmostras]');
    var $ResponsavelAmostra = $('[name=ResponsavelAmostra]');
    var $QuantidadeAmostra = $('[name=QuantidadeAmostra]');
    var $CentroCusto = $('[name=CentroCusto]');
    var $GrauComplexidade = $('[name=GrauComplexidade]');
    var $InicioProgramado = $('[name=InicioProgramado]');
    var $DuracaoEstimadaHoras = $('[name=DuracaoEstimadaHoras]');
    var $DuracaoEstimadaMinutos = $('[name=DuracaoEstimadaMinutos]');
    var $Observacoes = $('[name=Observacoes]');

    switch (status) {
        case 'Rascunho':
            $TipoLote.attr('disabled', false);
            $Fabrica.attr('disabled', false);
            $LinhaEquipamento.attr('disabled', false);
            $CodigoProduto.attr('disabled', false);
            $LinhaProduto.attr('disabled', false);
            $DescricaoProduto.attr('disabled', false);
            $Projeto.attr('disabled', false);
            $CategoriaProjeto.attr('disabled', false);
            $Formula.attr('disabled', false);
            $QuantidadePecas.attr('disabled', false);
            $Motivo.attr('disabled', false);
            $EnvioAmostras.attr('disabled', false);
            $ResponsavelAmostra.attr('disabled', false);
            $QuantidadeAmostra.attr('disabled', false);
            $CentroCusto.attr('disabled', false);
            $GrauComplexidade.attr('disabled', false);
            $InicioProgramado.attr('disabled', false);
            $DuracaoEstimadaHoras.attr('disabled', false);
            $DuracaoEstimadaMinutos.attr('disabled', false);
            $Observacoes.attr('disabled', false);
            break;
        case 'Agendado':
        case 'Registro das Análises':
        default:
            $TipoLote.attr('disabled', true);
            $Fabrica.attr('disabled', true);
            $LinhaEquipamento.attr('disabled', true);
            $CodigoProduto.attr('disabled', true);
            $LinhaProduto.attr('disabled', true);
            $DescricaoProduto.attr('disabled', true);
            $Projeto.attr('disabled', true);
            $CategoriaProjeto.attr('disabled', true);
            $Formula.attr('disabled', true);
            $QuantidadePecas.attr('disabled', true);
            $Motivo.attr('disabled', true);
            $EnvioAmostras.attr('disabled', true);
            $ResponsavelAmostra.attr('disabled', true);
            $QuantidadeAmostra.attr('disabled', true);
            $CentroCusto.attr('disabled', true);
            $GrauComplexidade.attr('disabled', true);
            $InicioProgramado.attr('disabled', true);
            $DuracaoEstimadaHoras.attr('disabled', true);
            $DuracaoEstimadaMinutos.attr('disabled', true);
            $Observacoes.attr('disabled', true);
            break;
    }
}

function ModificarStatus(status) {
    $('select#status').val(status);
    ModificarBotoesPorStatus(status);
    ModificarCamposPorStatus(status);
}

function RegistrarBindings() {
    var $tipoLote = $("select#tipoDeLote");
    var $fabrica = $("select#fabrica");
    var $linhaEquipamento = $("select#linhaEquipamento");

    $tipoLote.change(dispararCarregarLinhasEquipamentos);
    $fabrica.change(dispararCarregarLinhasEquipamentos);

    $linhaEquipamento.change(function () {
        var valSelected = $("select#linhaEquipamento").val();
        if (valSelected) {
            CarregarLinhasEquipamentosById(valSelected)
        }
    })
}

function PegarUsuarioAtual() {
    return $().SPServices.SPGetCurrentUser({
        fieldName: "Email"
    });
}

function ResetarAgendamento() {
    var $labelQuantidadePecas = $('label[for="produtoQuantidade"]');
    $labelQuantidadePecas.text("Quantidade (peças)");

    $('#main [name].salvar-campo').each(function () {
        var $this = $(this);

        if ($this.is('[type=checkbox]')) {
            $this.attr('checked', false);
        } else if ($this.is('select')) {
            $this.val('Selecione uma opção');
        } else {
            $this.val('');
        }

        $this.change();
    });

    ModificarStatus('Rascunho');
}

function SalvarAgendamento() {
    var id = $('input[name="ID"]').val();

    if (id) {
        return AtualizarAgendamento(id).then(function (response) {
            return CarregarAgendamento(response.record.attr('ows_ID'));
        });
    }

    return InserirAgendamento().then(function (response) {
        return CarregarAgendamento(response.record.attr('ows_ID'));
    });
}

function initializeAllPeoplePickers() {
    initializePeoplePicker('peoplePickerRespDLPCL', 'Área - DL PCL');
    $("#peoplePickerRespDLPCL_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespEngEnvase','Área - Engenharia de Envase');
    $("#peoplePickerRespEngEnvase_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteEngEnvase','Área - Engenharia de Envase');
    $("#peoplePickerGerenteEngEnvase_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespEngFab','Área - Engenharia de Fabricação');
    $("#peoplePickerRespEngFab_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteEngFab','Área - Engenharia de Fabricação');
    $("#peoplePickerGerenteEngFab_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespInDF','Área - Inovação DF');
    $("#peoplePickerRespInDF_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteInDF','Área - Inovação DF');
    $("#peoplePickerGerenteInDF_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespInvDE','Área - Inovação DE');
    $("#peoplePickerRespInvDE_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteInvDE','Área - Inovação DE');
    $("#peoplePickerGerenteInvDE_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespQualidade','Área - Qualidade');
    $("#peoplePickerRespQualidade_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteQualidade','Área - Qualidade');
    $("#peoplePickerGerenteQualidade_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerRespFabrica','Área - Fábrica');
    $("#peoplePickerRespFabrica_TopSpan").addClass("form-control");
    initializePeoplePicker('peoplePickerGerenteFabrica','Área - Fábrica');
    $("#peoplePickerGerenteFabrica_TopSpan").addClass("form-control");
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

$(document).ready(function () {
    switch (getUrlParameter('action')) {
        case 'new':
            {
                $.when(
                    CarregarCategoriaProjeto(),
                    CarregarFabricas(),
                    CarregarLinhasDoProduto(),
                    CarregarListaGrauComplexidade(),
                    CarregarListaMotivos(),
                    CarregarListaStatus(),
                    CarregarListaTiposLotes(),
                    dispararCarregarLinhasEquipamentos()
                ).then(function () {
                    RegistrarBindings();
                    ResetarAgendamento();
                    initializeAllPeoplePickers();

                    $("#produtoEnvioAmostras").change(function () {
                        if (this.checked) {
                            $("#formResponsavelAmostra").show();
                        } else {
                            $("#formResponsavelAmostra").hide();
                            $("#produtoResponsavelAmostra").text('');
                            $("#produtoQuantidadeAmostra").text('');
                        }
                    });

                    $('#tipoDeLote').change(function () {
                        switch (this.value) {
                            case 'Brinde':
                                $("#pills-responsaveis-tab").removeClass("disabled");
                                $("#pills-acompanhamento-tab").removeClass("disabled");

                                $("#pills-dlpcl-tab").show();
                                $("#pills-eng-envase-tab").hide();
                                $("#pills-eng-fabricacao-tab").hide();
                                $("#pills-inov-df-tab").hide();
                                $("#pills-inov-de-tab").hide();
                                $("#pills-qualidade-tab").show();
                                $("#pills-fabrica-tab").hide();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-eng-envase-acomp-tab").show();
                                $("#pills-eng-fabricacao-acomp-tab").show();
                                $("#pills-inov-df-acomp-tab").show();
                                $("#pills-inov-de-acomp-tab").show();
                                $("#pills-qualidade-acomp-tab").hide();
                                $("#pills-fabrica-acomp-tab").show();
                                $("#pills-meioambiente-acomp-tab").hide();

                                break;
                            case 'Envase':
                                $("#pills-responsaveis-tab").removeClass("disabled");
                                $("#pills-acompanhamento-tab").removeClass("disabled");

                                $("#pills-dlpcl-tab").show();
                                $("#pills-eng-envase-tab").show();
                                $("#pills-eng-fabricacao-tab").hide();
                                $("#pills-inov-df-tab").hide();
                                $("#pills-inov-de-tab").show();
                                $("#pills-qualidade-tab").show();
                                $("#pills-fabrica-tab").show();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-eng-envase-acomp-tab").hide();
                                $("#pills-eng-fabricacao-acomp-tab").show();
                                $("#pills-inov-df-acomp-tab").hide();
                                $("#pills-inov-de-acomp-tab").hide();
                                $("#pills-qualidade-acomp-tab").hide();
                                $("#pills-fabrica-acomp-tab").hide();
                                $("#pills-meioambiente-acomp-tab").show();

                                break;
                            case 'Fabricação':
                                $("#pills-responsaveis-tab").removeClass("disabled");
                                $("#pills-acompanhamento-tab").removeClass("disabled");

                                $("#pills-dlpcl-tab").show();
                                $("#pills-eng-envase-tab").hide();
                                $("#pills-eng-fabricacao-tab").show();
                                $("#pills-inov-df-tab").show();
                                $("#pills-inov-de-tab").hide();
                                $("#pills-qualidade-tab").show();
                                $("#pills-fabrica-tab").show();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-eng-envase-acomp-tab").show();
                                $("#pills-eng-fabricacao-acomp-tab").hide();
                                $("#pills-inov-df-acomp-tab").hide();
                                $("#pills-inov-de-acomp-tab").show();
                                $("#pills-qualidade-acomp-tab").hide();
                                $("#pills-fabrica-acomp-tab").hide();
                                $("#pills-meioambiente-acomp-tab").show();

                                break;
                            case 'Picking':
                                $("#pills-responsaveis-tab").addClass("disabled");
                                $("#pills-acompanhamento-tab").addClass("disabled");

                                $("#pills-dlpcl-tab").hide();
                                $("#pills-eng-envase-tab").hide();
                                $("#pills-eng-fabricacao-tab").hide();
                                $("#pills-inov-df-tab").hide();
                                $("#pills-inov-de-tab").hide();
                                $("#pills-qualidade-tab").hide();
                                $("#pills-fabrica-tab").hide();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-eng-envase-acomp-tab").hide();
                                $("#pills-eng-fabricacao-acomp-tab").hide();
                                $("#pills-inov-df-acomp-tab").hide();
                                $("#pills-inov-de-acomp-tab").hide();
                                $("#pills-qualidade-acomp-tab").hide();
                                $("#pills-fabrica-acomp-tab").hide();
                                $("#pills-meioambiente-acomp-tab").hide();

                                break;
                            default:
                                $("#pills-responsaveis-tab").addClass("disabled");
                                $("#pills-acompanhamento-tab").addClass("disabled");

                                $("#pills-dlpcl-tab").hide();
                                $("#pills-eng-envase-tab").hide();
                                $("#pills-eng-fabricacao-tab").hide();
                                $("#pills-inov-df-tab").hide();
                                $("#pills-inov-de-tab").hide();
                                $("#pills-qualidade-tab").hide();
                                $("#pills-fabrica-tab").hide();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-eng-envase-acomp-tab").hide();
                                $("#pills-eng-fabricacao-acomp-tab").hide();
                                $("#pills-inov-df-acomp-tab").hide();
                                $("#pills-inov-de-acomp-tab").hide();
                                $("#pills-qualidade-acomp-tab").hide();
                                $("#pills-fabrica-acomp-tab").hide();
                                $("#pills-meioambiente-acomp-tab").hide();

                                break;
                        }
                    });

                    $('#tipoDeLote').change();

                    $('.btn-salvar').click(function () {
                        SalvarAgendamento().then(function () {
                            alert("Agendamento Salvo");
                        }).fail(function () {
                            alert('Ops., algo deu errado. Mensagem: ' + response.errorText);
                        });

                        return false;
                    });

                    $('.btn-carregar').click(function () {
                        EscolherAgendamento();
                    });

                    $('.btn-concluir').click(function () {
                        ModificarStatus('Agendado');
                        SalvarAgendamento();
                    });

                    $('.btn-executado').click(function () {
                        ModificarStatus('Registro das Análises');
                        SalvarAgendamento();
                    });

                    $('.btn-aprovar').click(function () {
                        ModificarStatus('Aprovado');
                        SalvarAgendamento();
                    });

                    $('.btn-reprovar').click(function () {
                        ModificarStatus('Reprovado');
                        SalvarAgendamento();
                    });

                    InstanciarDateTimePicker();

                    CarregarHistorico(10267).then(function (registros) {
                        $.fn.dataTable.ext.errMode = 'throw';

                        $('#data-table').DataTable({
                            data: registros,
                            columns: [
                                { data: 'id', title: 'ID' },
                                { data: 'title', title: 'Ação' },
                                { data: 'area', title: 'Área' },
                                { data: 'mensagem', title: 'Mensagem' },
                                { data: 'author', title: 'Criado por' },
                                { data: 'created', title: 'Criado' }
                            ],
                            language: {
                                decimal: ',',
                                thousands: '.',
                                url: 'https://cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Portuguese-Brasil.json'
                            },
                            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
                            order: [[0, 'desc']],
                        });
                    });
                }).fail(function () {

                });

                break;
            }
        case 'edit': {
            if (getUrlParameter('loteid').length > 0) {
                $.when(
                    CarregarAgendamento(getUrlParameter('loteid')),
                    CarregarCategoriaProjeto(),
                    CarregarFabricas(),
                    CarregarLinhasDoProduto(),
                    CarregarListaGrauComplexidade(),
                    CarregarListaMotivos(),
                    CarregarListaStatus(),
                    CarregarListaTiposLotes(),
                    dispararCarregarLinhasEquipamentos()
                ).then(function () {
                    RegistrarBindings();
                    ResetarAgendamento();
                    initializeAllPeoplePickers();

                    $("#produtoEnvioAmostras").change(function () {
                        if (this.checked) {
                            $("#formResponsavelAmostra").show();
                        } else {
                            $("#formResponsavelAmostra").hide();
                            $("#produtoResponsavelAmostra").text('');
                            $("#produtoQuantidadeAmostra").text('');
                        }
                    });

                    $('#tipoDeLote').change(function () {
                        switch (this.value) {
                            case 'Brinde':
                                $("#pills-responsaveis-tab").removeClass("disabled");
                                $("#pills-acompanhamento-tab").removeClass("disabled");

                                $("#pills-dlpcl-tab").show();
                                $("#pills-qualidade-tab").show();

                                $("#pills-eng-envase-tab").hide();
                                $("#pills-eng-fabricacao-tab").hide();
                                $("#pills-inov-df-tab").hide();
                                $("#pills-inov-de-tab").hide();
                                $("#pills-fabrica-tab").hide();

                                $("#pills-dlpcl-acomp-tab").hide();
                                $("#pills-qualidade-acomp-tab").hide();

                                $("#pills-eng-envase-acomp-tab").show();
                                $("#pills-eng-fabricacao-acomp-tab").show();
                                $("#pills-inov-df-acomp-tab").show();
                                $("#pills-inov-de-acomp-tab").show();
                                $("#pills-fabrica-acomp-tab").show();

                                break;
                            case 'Envase':
                                $('li a[href="#tab-RespDLPCL"]').parent().show();
                                $('li a[href="#tab-RespEngEnv"]').parent().show();
                                $('li a[href="#tab-RespInvDF"]').parent().show();
                                $('li a[href="#tab-RespQual"]').parent().show();
                                $('li a[href="#tab-RespFab"]').parent().show();

                                $('li a[href="#tab-AcompInvDE"]').parent().show();
                                $('li a[href="#tab-AcompEngFab"]').parent().show();
                                $('li a[href="#tab-AcompMeioAmb"]').parent().show();
                                break;
                            case 'Fabricação':
                                $('li a[href="#tab-RespDLPCL"]').parent().show();
                                $('li a[href="#tab-RespEngFab"]').parent().show();
                                $('li a[href="#tab-RespInvDF"]').parent().show();
                                $('li a[href="#tab-RespQual"]').parent().show();
                                $('li a[href="#tab-RespFab"]').parent().show();

                                $('li a[href="#tab-AcompEngEnv"]').parent().show();
                                $('li a[href="#tab-AcompInvDE"]').parent().show();
                                $('li a[href="#tab-AcompMeioAmb"]').parent().show();
                                break;
                            case 'Picking':
                                $('#tabsResponsaveis').hide();
                                $('#tabsAcompanhamento').hide();
                                break;
                            default:
                                $("#pills-responsaveis-tab").addClass("disabled");
                                $("#pills-acompanhamento-tab").addClass("disabled");
                        }
                    });

                    $('#tipoDeLote').change();

                    $('.btn-salvar').click(function () {
                        SalvarAgendamento().then(function () {
                            alert("Agendamento Salvo");
                        }).fail(function () {
                            alert('Ops., algo deu errado. Mensagem: ' + response.errorText);
                        });

                        return false;
                    });

                    $('.btn-carregar').click(function () {
                        EscolherAgendamento();
                    });

                    $('.btn-concluir').click(function () {
                        ModificarStatus('Agendado');
                        SalvarAgendamento();
                    });

                    $('.btn-executado').click(function () {
                        ModificarStatus('Registro das Análises');
                        SalvarAgendamento();
                    });

                    $('.btn-aprovar').click(function () {
                        ModificarStatus('Aprovado');
                        SalvarAgendamento();
                    });

                    $('.btn-reprovar').click(function () {
                        ModificarStatus('Reprovado');
                        SalvarAgendamento();
                    });

                    InstanciarDateTimePicker();

                    CarregarHistorico(10267).then(function (registros) {
                        $.fn.dataTable.ext.errMode = 'throw';

                        $('#data-table').DataTable({
                            data: registros,
                            columns: [
                                { data: 'id', title: 'ID' },
                                { data: 'title', title: 'Ação' },
                                { data: 'area', title: 'Área' },
                                { data: 'mensagem', title: 'Mensagem' },
                                { data: 'author', title: 'Criado por' },
                                { data: 'created', title: 'Criado' }
                            ],
                            language: {
                                decimal: ',',
                                thousands: '.',
                                url: 'https://cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Portuguese-Brasil.json'
                            },
                            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
                            order: [[0, 'desc']],
                        });
                    });
                }).fail(function () {

                });

                break;
            }
            else {

            }
            break;
        }
        default: {
            break;
        }
    }

});